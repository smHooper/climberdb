"""
Create an Excel file of briefing appointment schedules for each day in a given
range. Breifing appointment details come from the climberdb frontend.
"""

from typing import Dict
import os
from openpyxl import Workbook
from openpyxl.utils import get_column_letter
from openpyxl.utils.units import DEFAULT_LEFT_MARGIN, DEFAULT_COLUMN_WIDTH
from openpyxl.styles import Border, Side, PatternFill, Font, Alignment

# from openpyxl source code (https://openpyxl.readthedocs.io/en/stable/_modules/openpyxl/utils/units.html):  
#	- "In Excel there are 72 points to an inch"
# 	also from same source code: DEFAULT_LEFT_MARGIN = 0.7 # in inches, = right margin
# this means that for an 8.5x11 print size, the print area width is 72 x (8.5 - (0.7 * 2)) pixels
PRINT_WIDTH_INCHES = 8.5 #for 8.5x11
WIDTH_FUDGE_FACTOR = 1/7 # for some reason, units in openpyxl are 1/7 the number of pixels in the actual Excel GUI
PRINT_WIDTH = 72 * (PRINT_WIDTH_INCHES - (DEFAULT_LEFT_MARGIN * 2)) * WIDTH_FUDGE_FACTOR


def create_sheet(workbook: Workbook, date_str: str, briefings: list[Dict], time_slots: list[str]) -> None:
	"""
	Add a worksheet to the given workbook that shows the briefing schedule for a single day

	Parameters
	____________
	workbook: An openpyxl.Workbook to write to
	date_str: ISO date like 2023-05-10 to use as the worksheet name
	briefings: a list of dictionaries, each of whcih contains information for a single briefing
		including the row/column indices it should occupy, the expedition name, and additional text
	time_slots: the labels for time slots in the schedule

	Returns
	___________
	None
	
	"""

	sheet = workbook.create_sheet(date_str)
	_time_label_width = 7

	# If there are no briefings scheduled, leave it blank and exit
	if len(briefings) == 0:
		return

	# Set the "background" cell borders to show a faint horizontal line at the top of each hour
	#	do this before adding briefing appointments to the schedule so the borders of the 
	#	appointments will overwrite the "background" lines
	background_border_style = Border(bottom=Side(border_style='thin', color='D9D9D9'))
	# Get the maximum column used for this date
	max_column = max([briefing_info['cell_indices'][-1] for briefing_info in briefings]) + 1

	# Add time slots
	for i, label in enumerate(time_slots):
		# Time labels should be on the hour but each row represents a half hour
		row_index = i * 2 + 2 # cell indices are 1-based and should start on the second row
		cell = sheet.cell(row=row_index, column=1, value=label)
		cell.alignment = Alignment(vertical='top')

		# Set "backgound" border style
		for column_index in range(1, max_column + 1):
			cell = sheet.cell(row=row_index - 1, column=column_index)
			cell.border = background_border_style

	# Set row height
	for row in range(1, sheet.max_row + 1):
		sheet.row_dimensions[row].height = 25

	# Set time label column width
	sheet.column_dimensions['A'].width = _time_label_width

	# Create styles
	fill = PatternFill(fill_type='solid', start_color='F28100', end_color='F28100')
	side_style = Side(border_style='thick', color='B86000')
	box_border = Border(top=side_style, left=side_style, right=side_style, bottom=side_style)
	top_border = Border(top=side_style, left=side_style, right=side_style)
	bottom_border = Border(left=side_style, right=side_style, bottom=side_style)
	alignment = Alignment(horizontal='left', vertical='center', indent=2.0, wrapText=True)

	for briefing_info in briefings:
		# Add 1 to each row and column to account for the time label column
		start_row, start_column, end_row, end_column = [i + 1 for i in briefing_info['cell_indices']]
		
		is_single_row = end_row == start_row 
		
		# Merge the top row
		# Occasionally, the briefings overlap even though they shouldn't. If so, just skip this one
		try:
			title_cell = sheet.cell(row=start_row, column=start_column, value=briefing_info['expedition_name'])
		except Exception as e:
			print(briefing_info['cell_indices'])
			continue
		
		# Setting border style on merged cells doesn't work (it only sets the border on the first cell), so set 
		#	each cell's style separately, then merge
		for i in range(start_column, end_column + 1):
			cell = sheet.cell(row=start_row, column=i)
			cell.border = box_border if is_single_row else top_border
			cell.alignment = alignment
			cell.fill = fill
			cell.font = Font(bold=True, color='FFFFFF')
		sheet.merge_cells(start_row=start_row, start_column=start_column, end_row=start_row, end_column=end_column)

		# Merge the rest if the briefing is more than one row
		if not is_single_row:
			info_top_row_index = start_row + 1
			sheet.cell(row=info_top_row_index, column=start_column, value=briefing_info['briefing_text'])
			
			# Setting border style on the merged cells doesn't work, so set the style on each cell, then merge
			for row in sheet.iter_rows(min_row=info_top_row_index, min_col=start_column, max_row=end_row, max_col=end_column):
				for cell in row:
					cell.border = bottom_border
					cell.fill = fill
					cell.alignment = alignment
					cell.font = Font(color='FFFFFF')

			try:
				sheet.merge_cells(start_row=info_top_row_index, start_column=start_column, end_row=end_row, end_column=end_column)
			except:
				continue

	# Set row width
	n_columns = sheet.max_column - 1
	if n_columns: # there's more than just the time labels
		schedule_width_px = PRINT_WIDTH - _time_label_width # subtract for time label column
		column_width = schedule_width_px // n_columns
		print(column_width)
		for i in range(2, n_columns + 2): # + 2 because range is exclusive
			sheet.column_dimensions[get_column_letter(i)].width = column_width


def briefings_to_excel(data: Dict, output_dir: str) -> str:
	"""
	Create an Excel doc of briefing appointments per day from a dictionary of 
	appointment details. Each day will be a separate sheet in the doc.

	Parameters
	____________
	data: Dictionary with keys 'time_slots' and 'briefings'. time_slots is a list of 
		times to label the schedule. Briefings is dictionary of with a key/value pair for 
		each day. The value of each day is a list of dictionaries, and each dictionary 
		represents a different appointment. The data object is therefore in the format:
			{
				time_slots: ['7am', '8am', ...],
				briefings: {
					2023-05-10: [{<breifing1 details}, {<breifing2 details}, ...],
					2023-05-11: [{<breifing1 details}, {<breifing2 details}, ...],
					...
				}
			}
	output_dir: Path to write the Excel doc to. The filename will be generated from the
		min and max dates specified in data['briefings']
	
	Returns
	__________
	str: filename of the Excel doc

	"""
	workbook = Workbook()
	del workbook['Sheet']

	if not 'time_slots' in data:
		raise KeyError('"time_slots" not given in data')

	if not 'briefings' in data:
		raise KeyError('"briefings" not given in data')

	if not os.path.isdir(output_dir):
		raise IOError(f'Cannot write output to output_dir "{output_dir}" because it does not exist')

	time_slots = data['time_slots']
	briefings = data['briefings']

	# Create a sheet per day
	for date_str in sorted(briefings.keys()):
		create_sheet(workbook, date_str, briefings[date_str], time_slots)

	# Write the Excel file
	briefing_dates = briefings.keys()
	filename = f'''briefing_schedule_{min(briefing_dates)}_to_{max(briefing_dates)}.xlsx'''
	excel_path = os.path.join(output_dir, filename)
	workbook.save(excel_path)

	return filename


