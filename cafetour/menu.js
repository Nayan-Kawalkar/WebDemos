/* ──────────────────────────────────────────────────────────
   Cafetoor menu — edit this file to change the menu board.

   ⚠ Everything below is PLACEHOLDER content. Replace the dishes,
     descriptions, prices, photos AND the veg / egg / non-veg marks
     with your real ones before publishing.

   ⚠ The dish photos in assets/menu/ are public-domain STAND-INS
     (see assets/menu/CREDITS.md) — not your food. Swap in photos of
     your own dishes: save each as assets/menu/<name>.jpg (landscape,
     about 1000 × 750) and point `image` at it. A small square copy in
     assets/menu/thumbs/ with the same name keeps the page fast, but
     is optional — without it the big photo is used for the thumbnail.

   Category fields
     id       short id used in links, e.g. "coffee" → #menu-coffee
     label    category name
     note     one short line shown on the category banner (optional)
     image    banner photo (optional — without it you get a plain header)
     focus    crop focus for the banner photo, e.g. "50% 35%" (optional)
     columns  price columns, e.g. ["Hot", "Iced"] or ["300 ml", "500 ml"]
              (optional — leave out for a single price)

   Item fields
     name     dish name
     desc     one short line
     price    a number (220), or an object matching the columns:
              { Hot: 170, Iced: 190 } — leave a column out to show "—"
     diet     "veg" | "egg" | "nonveg" — shows the Indian food mark
     tags     e.g. ["Signature", "Guest Favorite", "New", "Classic"]
              — every tag you use becomes a filter button
     image    dish photo, e.g. "assets/menu/cappuccino.jpg" (optional)
     alt      describe the photo for screen readers (optional — the
              dish name is used if you leave it out)
   ────────────────────────────────────────────────────────── */

const CURRENCY = '₹';
const MENU_NOTE = 'Prices in ₹. Please tell us about any allergies when you order.';

const MENU = [
  {
    id: 'signatures',
    label: 'Signatures',
    note: 'The ones people come back for',
    image: 'assets/moss.jpg',
    focus: '60% 40%',
    items: [
      { name: 'Squeeze the Day', desc: 'Cold-pressed orange, carrot and ginger with a squeeze of lime.', price: 220, diet: 'veg', tags: ['Signature', 'Guest Favorite'], image: 'assets/menu/squeeze-the-day.jpg' },
      { name: 'House Cold Brew', desc: 'Steeped for eighteen hours, served over ice.', price: 190, diet: 'veg', tags: ['Signature'], image: 'assets/menu/house-cold-brew.jpg' },
      { name: 'Avocado & Egg Toast', desc: 'Sourdough, smashed avocado and a soft fried egg, finished with chilli flakes.', price: 260, diet: 'egg', tags: ['Guest Favorite'], image: 'assets/menu/avocado-egg-toast.jpg' },
      { name: 'Lemon Loaf', desc: 'Baked each morning with fresh zest and a dusting of sugar.', price: 150, diet: 'egg', tags: ['Classic'], image: 'assets/menu/lemon-loaf.jpg' },
    ],
  },
  {
    id: 'coffee',
    label: 'Coffee',
    note: 'Pulled to order, all day',
    image: 'assets/story.jpg',
    focus: '50% 45%',
    columns: ['Hot', 'Iced'],
    items: [
      { name: 'Espresso', desc: 'A double shot of our house blend — bright, sweet and clean.', price: { Hot: 120 }, diet: 'veg', tags: ['Classic'], image: 'assets/menu/espresso.jpg' },
      { name: 'Americano', desc: 'Espresso lengthened with hot water, or poured over ice.', price: { Hot: 140, Iced: 160 }, diet: 'veg', image: 'assets/menu/americano.jpg' },
      { name: 'Cappuccino', desc: 'Espresso under a thick cap of velvety milk foam.', price: { Hot: 170, Iced: 190 }, diet: 'veg', tags: ['Guest Favorite'], image: 'assets/menu/cappuccino.jpg' },
      { name: 'Flat White', desc: 'Two ristretto shots with silky micro-foam.', price: { Hot: 180 }, diet: 'veg', image: 'assets/menu/flat-white.jpg' },
      { name: 'Caffè Latte', desc: 'Smooth espresso with lightly textured milk.', price: { Hot: 180, Iced: 200 }, diet: 'veg', image: 'assets/menu/caffe-latte.jpg' },
      { name: 'Mocha', desc: 'Espresso, dark chocolate and steamed milk.', price: { Hot: 200, Iced: 220 }, diet: 'veg', tags: ['New'], image: 'assets/menu/mocha.jpg' },
      { name: 'Pour Over', desc: 'Single-origin beans, brewed slowly by hand.', price: { Hot: 210 }, diet: 'veg', tags: ['Signature'], image: 'assets/menu/pour-over.jpg' },
    ],
  },
  {
    id: 'juices',
    label: 'Juices',
    note: 'Cold-pressed from whole fruit',
    image: 'assets/bar.jpg',
    focus: '30% 55%',
    columns: ['300 ml', '500 ml'],
    items: [
      { name: 'Green Glow', desc: 'Spinach, green apple, cucumber and mint.', price: { '300 ml': 220, '500 ml': 320 }, diet: 'veg', tags: ['Guest Favorite'], image: 'assets/menu/green-glow.jpg' },
      { name: 'Citrus Sunrise', desc: 'Orange, sweet lime and grapefruit.', price: { '300 ml': 200, '500 ml': 290 }, diet: 'veg', image: 'assets/menu/citrus-sunrise.jpg' },
      { name: 'Ruby Root', desc: 'Beetroot, apple, carrot and a little ginger.', price: { '300 ml': 220, '500 ml': 320 }, diet: 'veg', image: 'assets/menu/ruby-root.jpg' },
      { name: 'Fresh Lemonade', desc: 'Hand-squeezed lemons, cane sugar and crushed mint.', price: { '300 ml': 150, '500 ml': 210 }, diet: 'veg', tags: ['Classic'], image: 'assets/menu/fresh-lemonade.jpg' },
      { name: 'Watermelon Cooler', desc: 'Watermelon, lime and a pinch of sea salt.', price: { '300 ml': 180, '500 ml': 260 }, diet: 'veg', tags: ['New'], image: 'assets/menu/watermelon-cooler.jpg' },
    ],
  },
  {
    id: 'bakery',
    label: 'Bakery',
    note: 'Out of the oven every morning',
    image: 'assets/pastry.jpg',
    focus: '45% 70%',
    items: [
      { name: 'Butter Croissant', desc: 'Flaky, golden and laminated by hand.', price: 140, diet: 'egg', tags: ['Classic'], image: 'assets/menu/butter-croissant.jpg' },
      { name: 'Almond Croissant', desc: 'Twice-baked with almond cream and toasted flakes.', price: 170, diet: 'egg', tags: ['Guest Favorite'], image: 'assets/menu/almond-croissant.jpg' },
      { name: 'Banana Bread', desc: 'Warm, soft and lightly spiced, with salted butter.', price: 130, diet: 'egg', image: 'assets/menu/banana-bread.jpg' },
      { name: 'Macarons', desc: 'A box of three — ask at the counter for today’s flavours.', price: 180, diet: 'egg', image: 'assets/menu/macarons.jpg' },
      { name: 'Cinnamon Roll', desc: 'Soft swirl, brown sugar and warm spice.', price: 150, diet: 'egg', image: 'assets/menu/cinnamon-roll.jpg' },
      { name: 'Dark Chocolate Cake', desc: 'Rich and fudgy with toasted walnuts, made without eggs.', price: 190, diet: 'veg', tags: ['New'], image: 'assets/menu/dark-chocolate-cake.jpg' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    note: 'Plates for slow mornings and long lunches',
    image: 'assets/booth.jpg',
    focus: '50% 60%',
    items: [
      { name: 'Granola Bowl', desc: 'House granola, thick yoghurt, fresh fruit and honey.', price: 240, diet: 'veg', image: 'assets/menu/granola-bowl.jpg' },
      { name: 'Masala Omelette', desc: 'Two eggs, onion, chilli and coriander, with toasted sourdough.', price: 220, diet: 'egg', tags: ['New'], image: 'assets/menu/masala-omelette.jpg' },
      { name: 'Veg Grilled Sandwich', desc: 'Vegetables, cheese and green chutney, toasted golden and served with fries.', price: 220, diet: 'veg', tags: ['Guest Favorite'], image: 'assets/menu/veg-grilled-sandwich.jpg' },
      { name: 'Mushroom Pizza', desc: 'Thin crust, mozzarella, garlic mushrooms and fresh thyme.', price: 320, diet: 'veg', image: 'assets/menu/mushroom-pizza.jpg' },
      { name: 'Crispy Chicken Burger', desc: 'Crumb-fried chicken, slaw and garlic mayo in a toasted brioche bun.', price: 300, diet: 'nonveg', image: 'assets/menu/crispy-chicken-burger.jpg' },
      { name: 'Garden Salad', desc: 'Crisp greens, cucumber, carrot and a lemon vinaigrette.', price: 230, diet: 'veg', image: 'assets/menu/garden-salad.jpg' },
    ],
  },
];
