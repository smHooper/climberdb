import sys
import os
import re
import json
import sqlalchemy
import pyodbc
import warnings
import pandas as pd
from datetime import datetime


COLUMN_MAP = {
    'tblClimbers': {
        'pg_table': 'climbers',
        'columns': {
            'ClimberID':    'id',
            'FirstName':    'first_name',
            'LastName':     'last_name',
            'Address':      'address',
            'City':         'city',
            'State':        'state_code',
            'Zip':          'postal_code',
            'Nation':       'country_code',
            'DOB':          'dob',
            'Age':          'age',
            'Email':        'email_address',
            'Cell':         'phone',
            'Sex':          'sex_code',
            'SoloForm':     'solo_form_signed',
            'FrostBite':    'hx_of_frostbite',
            'AMS':          'hx_of_ams',
            'HACE':         'hx_of_hace',
            'HAPE':         'hx_of_hape',
            'MedicalNote':  'hx_notes',
            'ClimberNotes': 'internal_notes',
            'ProPin':       'received_pro_pin'
        }
     },
    'tblEmergencyContacts': {
        'pg_table': 'emergency_contacts',
        'columns': {
            'EmergencyID': 'id',
            'ClimberID':    'climber_id',
            'Relationship': 'relationship',
            'FirstName':    'first_name',
            'LastName':     'last_name',
            'Address':      'address',
            'City':         'city',
            'State':        'state_code',
            'Zip':          'postal_code',
            'Nation':       'country_code',
            'Email':        'email_address',
            'HomePhone':    'primary_phone',
            'WorkPhone':    'alternate_phone',
            'Notes':        'internal_notes'
        }
    },
    'tblGroups': {
        'pg_table': 'expeditions',
        'columns': {
            'GroupID':              'id',
            'PermitNumber':         'permit_number',
            'GroupName':            'expedition_name',
            'PlanDeparture':        'planned_departure_date',
            'PlanRetreat':          'planned_return_date',
            'ActDeparture':         'actual_departure_date',
            'ActRetreat':           'actual_return_date',
            'GuideCo':              'guide_company_code',
            'AirTaxi':              'air_taxi_code',
            'GroupEnteredBy':       'entered_by',
            'GroupEntered':         'entry_time',
            'GroupReviewedBy':      'reviewed_by',
            'GroupBriefedBy':       'briefed_by',
            'CheckedIn':            'checked_in_datetime',
            'SanitationProblems':   'sanitation_problems',
            'LossOfEquipment':      'equipment_loss',
            'GroupStatus':          'group_status_code',
            'NeedsSpecialUsePermit':'needs_special_use_permit',
            'SpecialGroupType':     'special_group_type_code'
        }
    },
    'tblGroupsRes': {
        'pg_table': 'expedition_members',
        'columns': {
            'GroupResID':   'id',
            'GroupID':      'expedition_id',
            'ClimberID':    'climber_id',
            'DateRes':      'datetime_reserved',
            'DateCancelled':  'datetime_cancelled',
            'DateReturnedEarly': 'early_return_date',
            'CheckedIn':    'is_checked_in',
            'Status':       'reservation_status',
            'IllegalGuide': 'is_illegal_guide',
            'ResNotes':     'internal_notes',
            'Leader':       'is_trip_leader',
            'FrostBite':    'frostbite_severity_code',
            'AMS':          'had_ams',
            'HACE':         'had_hace',
            'HAPE':         'had_hape',
            'MedicalNotes': 'medical_notes',
            'Highest':      'highest_elevation_ft',
            'ClimberNotes': 'climber_comments'
        }
    },
    'tblGroupsResRoutes': {
        'pg_table': 'planned_routes',
        'columns': {
            'GroupResID':   'expedition_member_id',
            'RouteCode':    'route_code',
            'RouteOrder':   'route_order',
            'RouteSummited':'summit_date',
            'route_was_climbed': 'route_was_climbed'
        }
    },
    'tblRangers': {
        'pg_table': 'users',
        'columns': {
            'RangerID': 'id',
            'RangerFirstName': 'first_name',
            'RangerLastName': 'last_name'
        }
    }
}

LOOKUP_TABLES = pd.DataFrame([
    {
        'lookup_table':         'tblGuideCompanies',
        'pg_table':             'guide_company_codes',
        'access_lookup_column': 'GuideCo',
        'name_column':          'GuideCoName',
        'access_data_table':    'tblGroups',
        'access_data_column':   'GuideCo'
    },
    {
        'lookup_table':         'tblAirTaxies',
        'pg_table':             'air_taxi_codes',
        'access_lookup_column': 'AirTaxi',
        'name_column':          'AirTaxiName',
        'access_data_table':    'tblGroups',
        'access_data_column':   'AirTaxi'
    },
    {
        'lookup_table':         'tblSpecialGroupTypes',
        'pg_table':             'special_group_type_codes',
        'access_lookup_column': 'SpecialGroupType',
        'name_column':          'SpecialGroupType',
        'access_data_table':    'tblGroups',
        'access_data_column':   'SpecialGroupType'
    },
    {
        'lookup_table':         'tblStatusCodes',
        'pg_table':             'group_status_codes',
        'access_lookup_column': 'StatusCode',
        'name_column':          'StatusDesc',
        'access_data_table':    'tblGroups',
        'access_data_column':   'GroupStatus'
    },
    {
        'lookup_table':         'tblStatusCodes',
        'pg_table':             'reservation_status_codes',
        'access_lookup_column': 'StatusCode',
        'name_column':          'StatusDesc',
        'access_data_table':    'tblGroupsRes',
        'access_data_column':   'Status'
    },
    {
        'lookup_table':         'tblRoutes',
        'pg_table':             'route_codes',
        'access_lookup_column': 'RouteCode',
        'name_column':          'RouteName',
        'access_data_table':    'tblGroupsResRoutes',
        'access_data_column':   'RouteCode'
    }
])

COUNTRY_CODE_MAP = {
    'ATL': 14,
    'BOS': 29,
    'COL': 49,
    'EGY': 66,
    'HOL': 157,
    'IRA': 105,
    'KOR': 118,
    'LIT': 129,
    'MAC': 132,
    'NAM': 154,
    'NZD': 159,
    'SAU': 195,
    'TAN': 220,
    'USA': 236,
    'usa': 236,
    'UK':  235
}


SEX_CODE_MAP = {
    'F': 1,
    'M': 2,
    '': None
}

FROSTBITE_CODE_MAP = {
    'Minor': 3,
    'Moderate': 4,
    'Severe':   5,
    'None': None,
    '0': None
}

def main(db_path, pg_connection_json, appending_new_data=False):

    with open(pg_connection_json) as f:
        connection_info = json.load(f)
    pg_engine = sqlalchemy.create_engine(
        'postgresql://{username}:{password}@{ip_address}:{port}/{db_name}'.format(**connection_info)
    )
    with pg_engine.connect() as conn, conn.begin():
        access_conn =  pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=%s' % db_path)
        data = {}
        for access_table in COLUMN_MAP:
            data[access_table] = pd.read_sql(f'''SELECT * FROM [{access_table}]''', access_conn)

        # For all lookup tables/fields, make sure that all values in the data field are in the lookup table. Only values
        #   currently in the lookup table should have a sort_order value, though
        for _, lookup_info in LOOKUP_TABLES.iterrows():
            lookup_table = pd.read_sql(f'''SELECT * FROM [{lookup_info.lookup_table}]''', access_conn)
            # Drop what should just be null values from the lookup table
            lookup_table = lookup_table.loc[lookup_table[lookup_info.access_lookup_column] != '<>']
            # Also drop these from the data values
            data_values = data[lookup_info.access_data_table][lookup_info.access_data_column].replace({'0': None, '<>': None})

            # Get the values from the data that no longer exist in the data table because referential integrity wasn't enforced
            lookup_values = lookup_table.loc[:, lookup_info.access_lookup_column]
            inactive_values = data_values.loc[~data_values.isin(lookup_values)].dropna().unique()
            lookup_table['name'] = lookup_table[lookup_info.name_column]
            lookup_table['sort_order'] = lookup_table.index + 1
            if len(inactive_values):
                lookup_table = lookup_table.append(
                    pd.DataFrame({'name': inactive_values, lookup_info.access_lookup_column: inactive_values}),
                    ignore_index=True
                )
            lookup_table['code'] = lookup_table.index + 1

            lookup_table_columns = ['name', 'code', 'sort_order']
            if lookup_info.lookup_table == 'tblRoutes':
                mountain_codes = pd.read_sql_table('mountain_codes', conn).set_index('name').code
                lookup_table = lookup_table.replace({'Mountain': mountain_codes})\
                    .sort_values(['Mountain', 'name'])\
                    .rename(columns={'Mountain': 'mountain_code'})\
                    .reset_index()
                lookup_table.sort_order = lookup_table.index + 1
                lookup_table_columns = ['mountain_code', 'name', 'code', 'sort_order']

            replace_dict = {row[lookup_info.access_lookup_column]: row.code for _, row in lookup_table.iterrows()}

            # Replace values in data table
            data[lookup_info.access_data_table][lookup_info.access_data_column] = data_values.replace(replace_dict)

            # INSERT into database
            if not appending_new_data:
                lookup_table.loc[:, lookup_table_columns].to_sql(lookup_info.pg_table, conn, index=False, if_exists='append')

        access_countries = pd.read_sql('SELECT * FROM tblNations', access_conn)
        access_states = pd.read_sql('SELECT * FROM tblStates', access_conn)

        access_conn.close()


        #climbers and emerg. contacts tables: state in GU, PR, VI, set null and set country to 237
        #   if state == 'XX' set null
        countries = pd.read_sql_table('country_codes', pg_engine)
        states = pd.read_sql_table('state_codes', pg_engine)
        country_dict = access_countries.merge(countries, left_on='NationName', right_on='name').set_index('Nation').code
        state_dict = access_states.merge(states, left_on='State', right_on='short_name').set_index('State').code
        for table_name in ['tblClimbers', 'tblEmergencyContacts']:
            people_from_us_territories = data[table_name].loc[data[table_name].State.isin(['GU', 'PR', 'VI'])]
            this_table = data[table_name]
            this_table.loc[people_from_us_territories.index, 'State'] = None
            this_table.loc[people_from_us_territories.index, 'Nation'] = 237
            this_table.loc[this_table.State == 'XX', 'State'] = None
            this_table.replace({'Nation': country_dict, 'State': state_dict}, inplace=True)
            this_table.Nation.replace(COUNTRY_CODE_MAP, inplace=True)
            # Set invalid entries to null
            this_table.loc[~this_table.Nation.isin(countries.code), 'Nation'] = None
            other_state_mask = ~this_table.State.isin(states.code)
            this_table['other_state_name'] = this_table.loc[other_state_mask, 'State']
            this_table.loc[other_state_mask, 'State'] = None
            data[table_name] = this_table

        data['tblClimbers'].Sex = data['tblClimbers'].Sex.str.upper().replace(SEX_CODE_MAP)

        # frostbite codes changed 2020-3-12, so set old 1s and 2s to old values
        #   The only frostbite data recorded in the climber's table is from before 2012, so just replace all of them
        data['tblClimbers'].FrostBite = data['tblClimbers'].FrostBite.replace({'0': None, '1': 3, '2': 4, '3': 5})
        old_frostbite = data['tblGroupsRes'].loc[
            data['tblGroupsRes'].DateRes <= datetime.strptime('2020-3-12', '%Y-%m-%d'),
            'FrostBite'
        ].replace({1: 3, 2: 4})
        data['tblGroupsRes'].loc[old_frostbite.index, 'FrostBite'] = old_frostbite
        data['tblGroupsRes'].FrostBite = data['tblGroupsRes'].FrostBite.replace(FROSTBITE_CODE_MAP)

        data['tblClimbers'].loc[data['tblClimbers'].Age == 0, 'Age'] = None

        # Fill in some
        planned_routes = data['tblGroupsResRoutes']
        planned_routes.loc[~planned_routes.RouteSummited.isna(), 'route_was_climbed'] = True
        data['tblGroupsResRoutes'] = planned_routes

        # Replace column names and import data
        for access_table, table_info in COLUMN_MAP.items():
            columns = table_info['columns']
            table = data[access_table].rename(columns=columns).reindex(columns=columns.values())
            if access_table == 'tblRangers':
                table['user_role_code'] = 2
                table['ad_username'] = table.apply(lambda row: (row.first_name[0] + row.last_name).lower(), axis=1)
                table.drop_duplicates(['first_name', 'last_name'], inplace=True)

            if appending_new_data:
                # Drop any data whose ID already exists
                a = 1
            else:
               table.to_sql(table_info['pg_table'], conn, index=False, if_exists='append')


if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:]))
