import os
from typing import Optional, Union, Collection
from PIL import Image
import zpl
import zebra
import urllib.parse
import requests
import webbrowser
import tempfile

MILLIMETERS_PER_INCH = 25.4
NPS_LOGO_PATH = 'static/arrowhead_cache_tag.jpg'

class CacheTag:

    def __init__(
            self,
            expedition_name: str,
            expedition_leader: str,
            permit_number: str,
            air_taxi: str,
            return_date: str,
            label_height: Optional[int]=3,
            label_width: Optional[int]=5.75,
            label_margin: Optional[Union[int, float]]=1/8
        ):

        self.zebra = zebra.Zebra()
        self.printers = self.zebra.getqueues()
        self.label = zpl.Label(label_height * MILLIMETERS_PER_INCH, label_width * MILLIMETERS_PER_INCH)
        self.label_margin = label_margin

        # Expedition info
        self.expedition_name = expedition_name
        self.expedition_leader = expedition_leader
        self.permit_number = permit_number
        self.air_taxi = air_taxi
        self.return_date = return_date


    def __repr__(self) -> str:
        return self.zebra.__repr__()


    def write_text(
            self,
            text: str,
            x: Union[int, float],
            y: Union[int, float],
            text_box_width: Union[int, float],
            max_lines:Optional[int]=1,
            justification:Optional[str]='L',
            font_size_mm:Optional[int]=8
        ):
        """
        Wrapper for zpl.Label.write_text because it's dumb to have to set the origin each time you want to add
        something instead of just specifying the location where you want it
        """
        self.label.origin(x, y)
        self.label.write_text(
            text,
            char_height=font_size_mm,
            char_width=font_size_mm,
            line_width=text_box_width,
            max_line=max_lines,
            justification=justification
        )
        self.label.endorigin()

    def build_label_image(self, origin_x: Optional[int]=0, origin_y: Optional[int]=0) -> None:
        """
        Helper function to produce one of 2 images on the label at the specified origin

        :param orign_x: The right-most coordinate in mm of the image within the label
        :param origin_y: The top-most coordinate in mm of the image within the label
        """
        arrowhead_img = Image.open(NPS_LOGO_PATH)
        half_width_mm = self.label.width / 2
        margin_mm = self.label_margin * MILLIMETERS_PER_INCH
        resolution = self.label.dpmm
        print_area_width = half_width_mm - (margin_mm * 2)

        # Keep track of where we are on the Y axis
        current_y_mm = origin_y + margin_mm

        # Add arrowhead
        self.label.origin(origin_x + margin_mm, origin_y + margin_mm)
        logo_width = 0.75 * MILLIMETERS_PER_INCH  #3/4" wide
        logo_height = self.label.write_graphic(arrowhead_img, logo_width)
        self.label.endorigin()

        # Add DNPP text
        dena_text_left = origin_x + logo_width + 5
        dena_text_width = print_area_width - logo_width
        dena_text_top = margin_mm
        self.write_text('Denali National Park and Preserve', dena_text_left, dena_text_top, dena_text_width, max_lines=2, font_size_mm=5)

        # Permit number text
        permit_font_size = 6
        permit_text_top = current_y_mm + logo_height - permit_font_size
        self.write_text(f'Permit #: {self.permit_number}', dena_text_left, permit_text_top, dena_text_width, max_lines=1, font_size_mm=permit_font_size)

        # Add rule below logo
        current_y_mm += logo_height + 0.5
        underline_height_mm = 1.5
        underline_height_dots = underline_height_mm * resolution
        self.label.origin(origin_x + margin_mm, current_y_mm)
        self.label.draw_box((half_width_mm - (margin_mm * 2)) * resolution, underline_height_dots, underline_height_dots)
        self.label.endorigin()
        current_y_mm += underline_height_mm

        current_y_mm += 5
        def add_expedition_info(name, value, current_y_mm):
            info_font_size = 4
            attribute_name_left  = origin_x + margin_mm
            attribute_name_width = print_area_width/3
            attribute_value_left = origin_x + attribute_name_width + 5
            attribute_value_width= print_area_width - attribute_name_width - 5
            self.write_text(name, attribute_name_left, current_y_mm, attribute_name_width, font_size_mm=info_font_size)
            self.write_text(value, attribute_value_left, current_y_mm, attribute_value_width, font_size_mm=info_font_size, max_lines=2)
            return current_y_mm  + 10

        current_y_mm = add_expedition_info('Expedition:', self.expedition_name, current_y_mm)
        current_y_mm = add_expedition_info('Leader:', self.expedition_leader, current_y_mm)
        current_y_mm = add_expedition_info('Air taxi:', self.air_taxi, current_y_mm)
        current_y_mm = add_expedition_info('Return date:', self.return_date, current_y_mm)

    def build_cache_tag_label(self) -> None:
        """
        Each cache tag label is duplicated to make printing more efficient. Build the whole tag label by creating the same image twice
        """
        label_width = self.label.width

        self.build_label_image()
        self.build_label_image(origin_x=label_width/2)


    def get_preview_url(self) -> str:
        """
        Generate a Labelary REST API URL (http://labelary.com/) to preview a ZPL label
        """
        label = self.label
        label_height = label.height/MILLIMETERS_PER_INCH
        label_width = label.width/MILLIMETERS_PER_INCH
        zpl_str = urllib.parse.quote(label.dumpZPL())

        return f'''http://api.labelary.com/v1/printers/{label.dpmm}dpmm/labels/{label_width}x{label_height}/0/{zpl_str}'''

    def preview_in_browser(self) -> None:

        browser = webbrowser.get()
        url = self.get_preview_url()
        browser.open_new(url)

    # def write_tag_image(self) -> None:
    #     response = requests.get(self.get_preview_url())
    #     temp_path = os.path.join(tempfile.tempdir, 'test_cache_tag.png')


def test_tag():
    tag = CacheTag('Some Expedition', 'Sam Hooper', '103423', 'Talkeetna Air Taxi', '5/23/2023')
    tag.build_cache_tag_label()
    tag.label.preview()

