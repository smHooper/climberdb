"""
audit.py - record which users accessed which PII records.

Reusable across Flask apps: nothing here imports the app. Each app injects its
engine, its username getter, and its PII mapping through init_app().
"""
import re
from urllib.parse import urlparse
from uuid import uuid4

from flask import Flask, abort, current_app, has_request_context, request
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


    def record_rows(
            self, 
            rows: list[dict], 
            source: str | None = None,
            request_id: str | None = None
        ):
        """Record every PII entity found in a list of row dicts about to be returned"""
        pairs = set()
        for row in rows:
            for column, entity in self.key_columns.items():
                pairs.add((entity, row.get(column)))
            if source in self.id_tables:
                pairs.add((source, row.get('id')))
        
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


def get_audit() -> Audit:
    """For helper modules that can't import the app's Audit instance"""
    return current_app.extensions['audit']
