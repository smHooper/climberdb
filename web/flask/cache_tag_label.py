import os
from typing import Optional, Union, Collection
import PIL.Image
import PIL.ImageOps
import string
import zpl
import zebra
import urllib.parse
import numpy as np
import math
import re
import requests
import webbrowser
import tempfile

MILLIMETERS_PER_INCH = 25.4
PRINTER_RESOLUTION = 8 # dots per mm
NPS_LOGO_PATH = 'static/arrowhead_cache_tag.jpg'
DOI_CRT_PATH = r'\\inpdenaterm01\doi_root_ca_file\DOIRootCA.crt'
HEX_REGEX = '|'.join([f'^{c}+' for c in string.digits + string.ascii_uppercase[:6]])
BYTES_REGEX = '^0+|^1+'
ZPL_COMPRESSION_DICT = (
    {i + 1: character for i, character in enumerate(string.ascii_uppercase[6:-1])} |
    {20 + i * 20: character for i, character in enumerate(string.ascii_lowercase[6:])}
)
LABELARY_API_URL = 'https://api.labelary.com'


class CacheTag:

    def __init__(
            self,
            expedition_name: str,
            expedition_leader: str,
            expedition_id: str,
            air_taxi: str,
            return_date: str,
            label_height: Optional[int]=3,
            label_width: Optional[int]=5.75,
            label_margin: Optional[Union[int, float]]=1/8
        ):

        self.zebra = zebra.Zebra()
        self.printers = self.zebra.getqueues()
        self.label = zpl.Label(label_height * MILLIMETERS_PER_INCH, label_width * MILLIMETERS_PER_INCH, dpmm=PRINTER_RESOLUTION)
        self.label_margin = label_margin

        # Expedition info
        self.expedition_name = expedition_name
        self.expedition_leader = expedition_leader
        self.expedition_id = expedition_id
        self.air_taxi = air_taxi
        self.return_date = return_date

        # Getting this from Labelary API, so just call it once
        self.arrowhead_zpl_str = ''


    def __repr__(self) -> str:
        return self.zebra.__repr__()


    def add_text(
            self,
            text: str,
            x: Union[int, float],
            y: Union[int, float],
            text_box_width: Union[int, float],
            max_lines:Optional[int]=1,
            justification:Optional[str]='L',
            font_size_mm:Optional[Union[int, float]]=8
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


    def _hex_line_to_zpl(self, bit_substr: str, length: Optional[int] = 0) -> str:
        """
        Helper function to convert a string of 0s OR 1s to compressed ZPL
        :param bit_substr: string of consecutive 1s or 0s
        :param length: optional - length of the string (because it's almost certainly already calculated)
        :return:
        """
        if not length:
            length = len(str)

        # the highest denomination, z, is 400 so start there
        zpl_str = 'z' * (length // 400)

        # next highest are multiples of 20
        divisor_20 = (length % 400) // 20
        if divisor_20 >= 1:
            zpl_str += ZPL_COMPRESSION_DICT[divisor_20 * 20]

        # lastly, get everything under 20
        remainder_20 = length % 20
        if remainder_20:
            zpl_str += ZPL_COMPRESSION_DICT[remainder_20]

        # and add the actual matched character
        zpl_str += bit_substr[0]

        return zpl_str


    def _hex_data_to_zpl(self, byte_str: str) -> str:
        zpl_str = ''

        while len(byte_str):
            match = re.search(HEX_REGEX, byte_str)
            if not match:
                raise ValueError(f'Invalid character in byte hex string: {byte_str}')
            match_str = match.group()

            # if the byte str is nothing but 0s or 1s, use the shorthand: 0s = ','; 1s equals '!'
            if match_str == byte_str:
                if '0' in byte_str:
                    zpl_str += ','
                elif 'F' in byte_str:
                    zpl_str += '!'
                break

            match_length = len(match_str)

            # If the match is 2 or less characters long, there's no advantage to using the compressed language
            if match_length <= 2:
                zpl_str += match_str
            else:  
                zpl_str += self._hex_line_to_zpl(match_str, match_length)

            # remove the matched string from the beginning of the byte_hex_str, so we can match the next
            #   repeated character
            byte_str = re.sub(f'^{match_str}', '', byte_str)

        return zpl_str


    def img_to_zpl(self, img):
        """
        Hit the Labelary API to convert an image to ZPL2 code

        :param img: PIL image
        :return:
        """
        # Write the image to a temporary file to be able to read in the file's binary data.
        temp_img = tempfile.NamedTemporaryFile(suffix='.jpg')
        temp_img.close()
        with open(temp_img.name, 'wb') as f: img.save(f)
        with open(temp_img.name, 'rb') as f: img_data = f.read()
        try:
            os.remove(temp_img)
        except:
            pass

        files = {'file': ('delete.jpg', img_data, 'img/jpeg', {'Expires': '10'})}
        headers = {'accept': 'application/json'}
        response = requests.post(f'{LABELARY_API_URL}/v1/graphics', headers=headers, files=files, verify=DOI_CRT_PATH)
        response.raise_for_status()
        response_json = response.json()
        total_bytes = response_json['totalBytes']
        row_bytes = response_json['rowBytes']
        zpl_data = response_json['data']
        zpl_str = f'''^GFA,{total_bytes},{total_bytes},{row_bytes},{zpl_data}^FS'''

        self.arrowhead_zpl_str = zpl_str

        return zpl_str


    def add_img(
            self,
            img: PIL.Image.Image,
            upper_left_x: Union[int, float],
            upper_left_y: Union[int, float],
            width_mm: Union[int, float],
            height_mm: Optional[int]=0
        ) -> float:
        """
        Convert an image to ZPL alternative data compression scheme. See https://support.zebra.com/cpws/docs/zpl/1994_46469lr1.pdf
        :param img: PIL Image to convert
        :param upper_left_x:
        :param upper_left_y:
        :param width_mm:
        :param height_mm:
        :return: img height in millimeters
        """
        # Add new origin for the image
        self.label.origin(upper_left_x, upper_left_y)

        if not height_mm:
            pixel_width, pixel_height = img.size
            aspect_ratio = pixel_height / pixel_width
            height_mm = aspect_ratio * width_mm

        # If the ZPL code hasn't already been saved to this CacheTag instance, get it
        img_zpl = self.arrowhead_zpl_str
        if not img_zpl:

            dpmm = self.label.dpmm

            # Resize image
            img = img.resize((round(width_mm * dpmm), round(height_mm * dpmm)), PIL.Image.NEAREST)

            # Labelary API does the inversion, no need for it here. ZPL expects white to 00 and black to be FF
            #img = PIL.ImageOps.invert(img.convert('L')).convert('1')

            img_zpl = self.img_to_zpl(img)

        self.label.code += img_zpl

        # img_array = np.array(img)
        #
        # # Calcaulte the number of bytes in the image. This is used as a parameter to the GF function. Since each pixel
        # #   is 1 bit, divide the number of pixels by 8 to get bytes
        # #n_bytes = math.ceil(math.ceil(width_mm * dpmm / 8.0) * height_mm * dpmm)#math.ceil(img_array.size / 8)
        # img_height, img_width = img_array.shape
        # n_bytes = img_height * img_width * 2
        # n_bytes_per_row = math.ceil(img_width / 8)
        # zpl_str = f'^GFA,{n_bytes},{n_bytes},{n_bytes_per_row},'
        #
        # for row_number, row in enumerate(img_array):
        #     # ZPl expects each pixel to be represented by a 0 or 1, so convert each hexidecimal byte represantation
        #     #   to 0 or 1
        #     byte_str = row.tobytes().hex().upper()
        #     import pdb; pdb.set_trace()
        #
        #     # If this is the first row, it should start with a comma (which would normally indicate that the row is all
        #     #   0s from the comma onward
        #     if row_number == 0 and len(set(byte_str)) == 1:
        #         self._hex_line_to_zpl(byte_str, img_width)
        #
        #     # Check if the previous row is identical to this one. If so, a colon repeats the row in ZPL data
        #     #   compression scheme
        #     if row_number > 0 and (img_array[row_number - 1] == row).all():
        #         zpl_str += ':'
        #         continue
        #
        #     zpl_str += self._hex_data_to_zpl(byte_str)
        #
        # self.label.code += zpl_str

        self.label.endorigin()

        return height_mm


    def build_label_image(self, origin_x: Optional[int]=0, origin_y: Optional[int]=0) -> None:
        """
        Helper function to produce one of 2 images on the label at the specified origin

        :param orign_x: The right-most coordinate in mm of the image within the label
        :param origin_y: The top-most coordinate in mm of the image within the label
        """
        arrowhead_img = PIL.Image.open(NPS_LOGO_PATH)
        half_width_mm = self.label.width / 2
        margin_mm = self.label_margin * MILLIMETERS_PER_INCH
        resolution = self.label.dpmm
        print_area_width = half_width_mm - (margin_mm * 2)
        margin_left = origin_x + margin_mm
        secondary_font_size = 4

        # Keep track of where we are on the Y axis
        current_y_mm = origin_y + margin_mm

        # Add SUP title text
        title_text_font_size = 5
        self.add_text('Climbing Special Use Cache Tag', margin_left, current_y_mm, print_area_width, max_lines=1, font_size_mm=title_text_font_size)
        current_y_mm += title_text_font_size + 2

        # Add arrowhead
        #self.label.origin(margin_left, current_y_mm)
        logo_width = 0.6 * MILLIMETERS_PER_INCH
        logo_height = self.add_img(arrowhead_img, margin_left, current_y_mm, logo_width)#self.label.write_graphic(arrowhead_img, logo_width)#
        #self.label.endorigin()

        # Add DNPP text
        dena_text_left = origin_x + logo_width + 10
        dena_text_width = print_area_width - logo_width
        dena_text_top = current_y_mm
        self.add_text('Denali National Park and Preserve', dena_text_left, dena_text_top, dena_text_width, max_lines=2, font_size_mm=secondary_font_size)

        # Permit number text
        permit_font_size = 7
        permit_text_top = current_y_mm + logo_height - permit_font_size
        self.add_text(f'Group #: {self.expedition_id}', dena_text_left, permit_text_top, dena_text_width, max_lines=1, font_size_mm=permit_font_size)

        # Add rule below logo
        current_y_mm += logo_height + 0.5
        underline_height_mm = 1
        underline_height_dots = underline_height_mm * resolution
        self.label.origin(origin_x + margin_mm, current_y_mm)
        self.label.draw_box((half_width_mm - (margin_mm * 2)) * resolution, underline_height_dots, underline_height_dots)
        self.label.endorigin()
        current_y_mm += underline_height_mm

        # For each attribute, the name and value text should be horizontally aligned in the same way, so locally
        #   define a little helper function to that
        current_y_mm += 5
        def add_expedition_info(name, value, current_y_mm):
            attribute_name_left  = origin_x + margin_mm
            attribute_name_width = print_area_width/3
            attribute_value_left = origin_x + attribute_name_width + 5
            attribute_value_width= print_area_width - attribute_name_width - 5
            self.add_text(name, attribute_name_left, current_y_mm, attribute_name_width, font_size_mm=secondary_font_size)
            self.add_text(value, attribute_value_left, current_y_mm, attribute_value_width, font_size_mm=secondary_font_size, max_lines=2)
            return current_y_mm  + 10

        current_y_mm = add_expedition_info('Expedition:', self.expedition_name, current_y_mm)
        current_y_mm = add_expedition_info('Leader:', self.expedition_leader, current_y_mm)
        current_y_mm = add_expedition_info('Air taxi:', self.air_taxi, current_y_mm)
        current_y_mm = add_expedition_info('Return date:', self.return_date, current_y_mm)


    def close_zpl(self):
        """
        Helper function to add closing ZPL2 command
        """

        self.label.code += '^XZ'


    def build_cache_tag_label(self) -> None:
        """
        Each cache tag label is duplicated because the image gets folded. Build the whole tag label by creating
        the same image twice
        """
        label_width = self.label.width

        self.build_label_image()
        self.build_label_image(origin_x=label_width/2)

        self.close_zpl()


    def render_label(self) -> bytes:
        """
        Generate PNG image data from the Labelary REST API to preview a ZPL label
        :return: byte string of PNG data
        """
        label = self.label
        label_height = int(round(label.height/MILLIMETERS_PER_INCH))
        label_width = int(round(label.width/MILLIMETERS_PER_INCH))
        zpl_str = label.dumpZPL()
        url = f'''{LABELARY_API_URL}/v1/printers/{int(label.dpmm)}dpmm/labels/{label_width}x{label_height}/0/'''
        response = requests.post(url, data=zpl_str, verify=DOI_CRT_PATH)
        response.raise_for_status()

        return response.content


    def get_preview_url(self) -> str:
        """
        Generate a Labelary REST API URL (http://labelary.com/) to preview a ZPL label
        """
        label = self.label
        label_height = label.height/MILLIMETERS_PER_INCH
        label_width = label.width/MILLIMETERS_PER_INCH
        zpl_str = urllib.parse.quote(label.dumpZPL())

        return f'''http://api.labelary.com/v1/printers/{label.dpmm}dpmm/labels/{label_width}x{label_height}/0'''


    def preview_in_browser(self) -> None:

        browser = webbrowser.get()
        url = self.get_preview_url()
        browser.open_new(url)


def test_tag():
    tag = CacheTag('Some Expedition', 'Sam Hooper', '5970', 'Talkeetna Air Taxi', '5/23/2023')
    tag.build_cache_tag_label()
    tag.label.preview()

    return tag

t = test_tag()
import pdb; pdb.set_trace()
