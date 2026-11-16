/* ──────────────────────────────────────────────────────────
   Arco — services, prices, looks and booking settings.
   Edit this file to change the service cards, the lookbook and
   the booking form.

   ⚠ Everything below is PLACEHOLDER content: replace the services,
     descriptions, times, prices and the WhatsApp number before
     publishing.

   ⚠ The look photos in assets/looks/ are STAND-INS found on Wikimedia
     Commons / Openverse (see assets/looks/CREDITS.md) — not your
     clients. Replace them with photos of your own work, taken with
     your clients' permission, before launch.

   Category fields
     id       short id, e.g. "haircuts"
     label    category name (shown big on the card)
     note     one short line under the name (optional)
     image    the card's arch photo
     focus    crop focus for that photo, e.g. "50% 35%" (optional)

   Service fields
     name     service name
     desc     one short line
     mins     how long it takes, in minutes — shows as "45 min"
     price    a number (600) — or options to choose between,
              e.g. { Short: 1200, Long: 1800 }
     tags     e.g. ["Signature"] — the first tag shows as a small badge
     look     a photo of the finished look (optional) — shows in the
              lookbook and as "See the look" on the card:
                src     the photo (portrait, about 800 × 1000)
                credit  photographer & licence, shown under the photo
                link    where the photo came from
              A square copy in assets/looks/thumbs/ with the same name
              is used for the small round preview (optional).
   ────────────────────────────────────────────────────────── */

const CURRENCY = '₹';

// Booking → WhatsApp. Your number with country code, digits only (e.g. 919876543210).
const BOOKING = {
  whatsapp: '910000000000',
  shopName: 'Arco',
  opens: '10:00',   // first slot
  closes: '20:30',  // last slot
  step: 30,         // minutes between slots
  days: 14,         // how many days ahead people can book
};

const CC = 'https://commons.wikimedia.org/wiki/File:';

const SERVICES = [
  {
    id: 'haircuts',
    label: 'Haircuts',
    note: 'Clippers, scissors and time taken',
    image: 'assets/stations.jpg',
    focus: '45% 55%',
    items: [
      { name: 'Signature Cut', desc: 'Consultation, precision cut, wash and style.', mins: 45, price: 600, tags: ['Signature'],
        look: { src: 'assets/looks/signature-cut.jpg', credit: 'Nenad Stojkovic · CC BY 2.0', link: `${CC}Barber_cutting_hair_with_comb._Back_view_of_man_in_barber_shop.jpg` } },
      { name: 'Skin Fade', desc: 'Seamless fade from skin to length, razor line-up.', mins: 45, price: 550, tags: ['Favourite'],
        look: { src: 'assets/looks/skin-fade.jpg', credit: 'Truth678 · CC BY-SA 4.0', link: `${CC}Fade_Hair_Cut.jpg` } },
      { name: 'Scissor Cut', desc: 'A soft, textured cut for longer styles.', mins: 40, price: 500,
        look: { src: 'assets/looks/scissor-cut.jpg', credit: 'Gaurav Dhwaj Khadka · CC BY-SA 4.0', link: `${CC}Barber_at_Work_in_Dubai.jpg` } },
      { name: 'Buzz Cut', desc: 'One length all over, clean neckline.', mins: 20, price: 300,
        look: { src: 'assets/looks/buzz-cut.jpg', credit: 'Absock · CC0', link: 'https://commons.wikimedia.org/w/index.php?curid=150075347' } },
      { name: 'Kids’ Cut', desc: 'For under-12s, patience included.', mins: 30, price: 350 },
      { name: 'Wash & Style', desc: 'Shampoo, conditioning and a blow-dry.', mins: 20, price: 250,
        look: { src: 'assets/looks/wash-style.jpg', credit: 'Mostafameraji · CC0', link: `${CC}Hair_coloring,_Barbershop_From_Iran_13.jpg` } },
    ],
  },
  {
    id: 'beard',
    label: 'Beard & Shave',
    note: 'Hot towels and a steady hand',
    image: 'assets/mirrors.jpg',
    focus: '50% 50%',
    items: [
      { name: 'Hot-Towel Shave', desc: 'Hot towels and a straight-razor shave, cooled with balm.', mins: 35, price: 450, tags: ['Signature'],
        look: { src: 'assets/looks/hot-towel-shave.jpg', credit: 'rawpixel · CC0', link: 'https://www.rawpixel.com/image/5926092/photo-image-public-domain-brush-free' } },
      { name: 'Beard Sculpt', desc: 'Shape, line-up and a hot-towel finish.', mins: 25, price: 350, tags: ['Favourite'],
        look: { src: 'assets/looks/beard-sculpt.jpg', credit: 'Singhjayreena · CC0', link: `${CC}Young_North_Indian_man_with_beard_in_white_t-shirt.jpg` } },
      { name: 'Beard Trim', desc: 'A quick tidy to keep the shape.', mins: 15, price: 200,
        look: { src: 'assets/looks/beard-trim.jpg', credit: 'Gkbediako · CC BY-SA 4.0', link: `${CC}A_Ghanaian_Barber_trimming_a_beard.jpg` } },
      { name: 'Beard Colour', desc: 'Natural-looking colour to even out greys.', mins: 30, price: 400, tags: ['New'],
        look: { src: 'assets/looks/beard-colour.jpg', credit: 'Mostafameraji · CC BY-SA 4.0', link: `${CC}Barber_shop_iran.jpg` } },
    ],
  },
  {
    id: 'colour',
    label: 'Colour',
    note: 'Subtle, natural or bold',
    image: 'assets/glass.jpg',
    focus: '55% 50%',
    items: [
      { name: 'Global Colour', desc: 'One even colour, root to tip.', mins: 60, price: { Short: 1200, Long: 1800 },
        look: { src: 'assets/looks/global-colour.jpg', credit: 'Mostafameraji · CC0', link: `${CC}Hair_coloring,_Barbershop_From_Iran_15.jpg` } },
      { name: 'Grey Blending', desc: 'Softens grey without a flat, dyed look.', mins: 45, price: { Short: 900, Long: 1300 }, tags: ['New'],
        look: { src: 'assets/looks/grey-blending.jpg', credit: 'Philippe Alès · CC BY-SA 4.0', link: `${CC}Back_head,_grey_hairs.jpg` } },
      { name: 'Highlights', desc: 'Hand-placed lightness for depth and movement.', mins: 90, price: { Short: 1800, Long: 2600 },
        look: { src: 'assets/looks/highlights.jpg', credit: 'Mostafameraji · CC0', link: `${CC}Hair_coloring,_Barbershop_From_Iran_10.jpg` } },
    ],
  },
  {
    id: 'care',
    label: 'Hair & Scalp',
    note: 'Slow rituals at the wash bay',
    image: 'assets/wash-pair.jpg',
    focus: '50% 60%',
    items: [
      { name: 'Scalp Ritual', desc: 'Exfoliating cleanse, steam and a long scalp massage.', mins: 40, price: 800, tags: ['Signature'] },
      { name: 'Hair Spa', desc: 'Deep conditioning for dry or tired hair.', mins: 50, price: 1200 },
      { name: 'Anti-Dandruff', desc: 'A clarifying treatment for a calm scalp.', mins: 45, price: 1000 },
      { name: 'Head Massage', desc: 'Twenty quiet minutes with warm oil.', mins: 20, price: 400, tags: ['Favourite'] },
    ],
  },
  {
    id: 'hands-feet',
    label: 'Hands & Feet',
    note: 'In the hand & foot lounge',
    image: 'assets/pedicure.jpg',
    focus: '50% 60%',
    items: [
      { name: 'Manicure', desc: 'Shape, cuticle care and a buff finish.', mins: 35, price: 600,
        look: { src: 'assets/looks/manicure.jpg', credit: 'rawpixel · CC0', link: 'https://www.rawpixel.com/image/6038363/photo-image-public-domain-hand-person' } },
      { name: 'Pedicure', desc: 'Warm soak, scrub, nail care and a foot massage.', mins: 45, price: 800, tags: ['Favourite'],
        look: { src: 'assets/pedicure.jpg', credit: 'Our hand & foot lounge' } },
      { name: 'Spa Pedicure', desc: 'Our pedicure with a mask and a longer massage.', mins: 60, price: 1200, tags: ['New'] },
    ],
  },
  {
    id: 'packages',
    label: 'Packages',
    note: 'A little more time in the chair',
    image: 'assets/lounge.jpg',
    focus: '50% 55%',
    items: [
      { name: 'The Full Arco', desc: 'Signature cut, hot-towel shave and a head massage.', mins: 90, price: 1300, tags: ['Signature'] },
      { name: 'Father & Son', desc: 'Two haircuts, side by side.', mins: 60, price: 900 },
      { name: 'Groom’s Package', desc: 'Cut, shave, scalp ritual, manicure and a final style.', mins: 180, price: 4500, tags: ['New'] },
    ],
  },
];
