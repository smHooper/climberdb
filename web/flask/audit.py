"""
audit.py - record which users accessed which PII records.

Reusable across Flask apps: nothing here imports the app. Each app injects its
engine, its username getter, and its PII mapping through init_app().
"""
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
import re
from uuid import UUID, uuid4

from flask import (
    Flask, 
    abort, 
    current_app, 
    has_request_context, 
    request
)
from sqlalchemy import text as sqlatext
from sqlalchemy.engine import Engine


def default_username_getter() -> str | None:
    """Normalized AD username from web server auth, never from the request body"""
    if not has_request_context() or not request.remote_user:
        return None
    return re.sub(r'^.+\\', '', request.remote_user).lower()


class Audit:
    def __init__(self, app: Flask | None = None, **kwargs):
        if app is not None:
            self.init_app(app, **kwargs)


    def init_app(
        self,
        app: Flask,
        engine: Engine,
        app_name: str,
        key_columns: dict[str, str],
        id_tables: set[str] | None = None,
        username_getter=default_username_getter,
        audit_schema: str = 'audit'
    ):
        """
        :param engine: engine for the insert-only audit_writer role
        :param key_columns: result column -> entity, e.g. {'climber_id': 'climbers'}.
            Recorded for every result that contains the column, whatever table or
            view it came from
        :param id_tables: tables whose own "id" is a recorded entity, e.g.
            {'climbers', 'emergency_contacts'}. Only used when a request names
            exactly one table, because "id" is ambiguous in multi-table results
        """
        self.engine = engine
        self.app_name = app_name
        self.key_columns = key_columns
        self.id_tables = id_tables or set()
        self.get_username = username_getter
        app.extensions['audit'] = self

        if not re.fullmatch(r'[a-z_][a-z0-9_]*', audit_schema):
            raise ValueError(f'Invalid audit schema: {audit_schema}')
        self.schema = audit_schema


    def _require_username(self) -> str:
        """
        Check that username is retreivable from the getter
        """
        username = self.get_username()
        if not username:
            abort(401)

        return username


    def record(
            self, 
            entity: str, 
            ids, 
            source: str | None = None,
            request_id: str | None = None
        ):
        if not request_id:
            request_id = str(uuid4())

        self._insert([(entity, i) for i in ids], source, request_id)


    def inspect_rows(
            self, 
            rows: list[dict], 
            source: str | None = None,
        ) -> set[tuple]:

        pairs = set()
        for row in rows:
            for column, entity in self.key_columns.items():
                pairs.add((entity, row.get(column)))
            if source in self.id_tables:
                pairs.add((source, row.get('id')))
        
        return pairs


    def record_rows(
            self, 
            rows: list[dict], 
            source: str | None = None,
            request_id: str | None = None
        ):
        """Record every PII entity found in a list of row dicts about to be returned"""

        pairs = self.inspect_rows(rows, source)
        
        if not request_id:
            request_id = str(uuid4())

        self._insert(pairs, source, request_id)


    def _insert(self, pairs, source, request_id):
        pairs = {(entity, int(i)) for entity, i in pairs if i is not None}
        if not pairs:
            return
        username = self.get_username()
        if not username:
            abort(401)  # no authenticated identity, no access to PII

        referrer = request.referrer
        page = urlparse(referrer).path[:200] if referrer else None
        params = [
            {
                'request_id': request_id,
                'app': self.app_name, 
                'user': username, 
                'entity': entity, 
                'id': i,
                'endpoint': request.path, 
                'source': source, 
                'page': page,
            }
            for entity, i in pairs
        ]
        # Not wrapped in try/except on purpose: if the audit row can't be written,
        #	the request fails and the data never reaches the client (fail closed)
        with self.engine.begin() as conn:
            conn.execute(sqlatext(f'''
                INSERT INTO {self.schema}.record_access
                    (request_id, app_name, ad_username, entity, entity_id, endpoint, source, page)
                VALUES (:request_id, :app, :user, :entity, :id, :endpoint, :source, :page)
                ON CONFLICT DO NOTHING
            '''), params)


    def _insert_event(self, conn, token: str, event: str, username: str):
        remote_addr = request.remote_addr if has_request_context() else None
        conn.execute(sqlatext(f'''
            INSERT INTO {self.schema}.file_events (token, event, ad_username, remote_addr)
            VALUES (CAST(:token AS uuid), :event, :user, :remote_addr)
        '''), {'token': token, 'event': event, 'user': username, 'remote_addr': remote_addr})


    def register_file(
            self,
            display_name: str,
            ext: str,
            contains_pii: bool,
            file_type: str = 'export',
            entities: dict[str, list[int]] | None = None,
            ttl_hours: int | None = 24,
            request_id: str | None = None
        ) -> tuple[str, str]:
        """
        Register a file before it is written to disk. Returns (token, stored_name);
        the caller writes the file to <directory>/<stored_name>.

        :param ext: extension including the dot, e.g. '.pdf'
        :param entities: PII entities the file contains, e.g.
            {'climbers': [1, 2], 'expedition_members': [10, 11]}
        :param ttl_hours: None for files that persist (attachments)
        """
        if file_type not in ('export', 'attachment'):
            raise ValueError(f'Invalid file_type: {file_type}')
        if not re.fullmatch(r'\.[A-Za-z0-9]{1,10}', ext):
            raise ValueError(f'Invalid extension: {ext}')

        username = self._require_username()
        request_id = request_id or str(uuid4())
        token = str(uuid4())
        stored_name = f'{token}{ext}'
        expires_at = (
            datetime.now(timezone.utc) + timedelta(hours=ttl_hours)
            if ttl_hours is not None else None
        )
        pairs = {
            (entity, int(i))
            for entity, ids in (entities or {}).items()
            for i in ids
            if i is not None
        }

        # One transaction: if any part fails, nothing is registered and the
        # request fails (fail closed)
        with self.engine.begin() as conn:
            conn.execute(sqlatext(f'''
                INSERT INTO {self.schema}.file_access
                    (token, app_name, file_type, display_name, stored_name,
                     contains_pii, created_by, expires_at)
                VALUES
                    (CAST(:token AS uuid), :app, :file_type, :display_name, :stored_name,
                     :contains_pii, :user, :expires_at)
            '''), {
                'token': token, 'app': self.app_name, 'file_type': file_type,
                'display_name': display_name, 'stored_name': stored_name,
                'contains_pii': contains_pii, 'user': username, 'expires_at': expires_at
            })
            if pairs:
                conn.execute(sqlatext(f'''
                    INSERT INTO {self.schema}.file_entities (token, entity, entity_id)
                    VALUES (CAST(:token AS uuid), :entity, :id)
                '''), [{'token': token, 'entity': e, 'id': i} for e, i in sorted(pairs)])
            self._insert_event(conn, token, 'created', username)

        # Generating the file reads PII, so also log it in record_access under
        # the same request_id as any rows recorded for this request
        if pairs:
            self._insert(pairs, f'file:{file_type}', request_id)

        return token, stored_name


    def lookup_file(self, token: str) -> dict | None:
        """
        Return manifest info for a file that is registered, unexpired, and not
        deleted. Returns None otherwise, including for malformed tokens.
        """
        try:
            token = str(UUID(token))
        except (ValueError, AttributeError, TypeError):
            return None

        with self.engine.connect() as conn:
            row = conn.execute(sqlatext(f'''
                SELECT f.token::text AS token, f.file_type, f.display_name,
                       f.stored_name, f.contains_pii, f.created_by,
                       f.created_at, f.expires_at
                FROM {self.schema}.file_access f
                WHERE f.token = CAST(:token AS uuid)
                  AND (f.expires_at IS NULL OR f.expires_at > now())
                  AND NOT EXISTS (
                      SELECT 1 FROM {self.schema}.file_events e
                      WHERE e.token = f.token AND e.event = 'deleted'
                  )
            '''), {'token': token}).first()
        
        return dict(row._mapping) if row else None


    def lookup_entity_ids(self, request_id: str) -> dict[str, list[int]]:
        """
        Lookup the entity IDs associated with a particular request
        """
        entity_ids = {}
        with self.engine.connect() as conn:
            conn.execute(sqlatext(f'''
                    SELECT count(*) FROM {self.schema}.record_access 
                    WHERE request_id=:request_id'
                '''), 
                {request_id: request_id}
            ).first()

            rows = conn.execute(sqlatext(f'''
                    SELECT 
                        entity, 
                        entity_id 
                    FROM {self.schema}.record_access 
                    WHERE request_id=:request_id'
                '''), 
                {request_id: request_id}
            )
            for row_ in rows:
                table_name = row_.entity
                if not entity_ids[table_name]:
                    entity_ids[table_name] = []
                entity_ids[table_name].append(row_.entiry_id)

        return entity_ids


    def record_download(self, token: str) -> dict:
        """
        Look up a file and log the download. Aborts with 404 if the file is
        unknown, expired, or deleted. Call this immediately before sending
        the file: if the event can't be written, the exception propagates
        and nothing is served (fail closed).
        """
        file_info = self.lookup_file(token)
        if not file_info:
            abort(404)
        username = self._require_username()
        with self.engine.begin() as conn:
            self._insert_event(conn, file_info['token'], 'downloaded', username)
        
        return file_info


    def list_expired_files(self) -> list[dict]:
        """Files past expires_at that haven't been recorded as deleted. For the cleanup job"""
        with self.engine.connect() as conn:
            rows = conn.execute(sqlatext(f'''
                SELECT f.token::text AS token, f.file_type, f.stored_name
                FROM {self.schema}.file_access f
                WHERE f.expires_at IS NOT NULL AND f.expires_at <= now()
                  AND NOT EXISTS (
                      SELECT 1 FROM {self.schema}.file_events e
                      WHERE e.token = f.token AND e.event = 'deleted'
                  )
            ''')).all()
            
        return [dict(r._mapping) for r in rows]


    def record_file_deleted(self, token: str, username: str | None = None):
        """
        Record that a file was removed from disk. In a request (e.g. deleting
        an attachment) the username comes from the request; the cleanup job
        passes its own, e.g. 'system:cleanup'.
        """
        username = username or self._require_username()
        with self.engine.begin() as conn:
            self._insert_event(conn, str(UUID(token)), 'deleted', username)

def get_audit() -> Audit:
    """For helper modules that can't import the app's Audit instance"""
    return current_app.extensions['audit']
