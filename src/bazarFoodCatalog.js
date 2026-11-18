const food = (id, name, emoji, defaultUnit, parentId, aliases = []) => ({
  id,
  name,
  emoji,
  defaultUnit,
  parentId,
  aliases,
});

// Searchable everyday bazar foods. Bengali, Banglish, English, and common
// misspellings live together so users can type the word that comes naturally.
export const BAZAR_FOOD_CATALOG = [
  // Rice, grains, flour, and staples
  food("rice-miniket", "মিনিকেট চাল", "🍚", "kg", "chal", ["miniket", "miniket rice"]),
  food("rice-nazirshail", "নাজিরশাইল চাল", "🍚", "kg", "chal", ["nazirshail", "nazirsail", "najirshail", "nazir rice"]),
  food("rice-kataribhog", "কাটারিভোগ চাল", "🍚", "kg", "chal", ["kataribhog", "katari bhog", "aromatic rice"]),
  food("rice-basmati", "বাসমতি চাল", "🍚", "kg", "chal", ["basmati", "basmoti", "basmati rice"]),
  food("rice-polao", "পোলাও চাল", "🍚", "kg", "chal", ["polao chal", "pulao rice", "polao rice"]),
  food("rice-atap", "আতপ চাল", "🍚", "kg", "chal", ["atap", "atap rice", "sun dried rice"]),
  food("rice-siddho", "সিদ্ধ চাল", "🍚", "kg", "chal", ["siddho chal", "seddho chal", "parboiled rice"]),
  food("flour-atta", "আটা", "🌾", "kg", "others", ["ata", "atta", "wheat flour", "whole wheat flour"]),
  food("flour-maida", "ময়দা", "🌾", "kg", "others", ["moyda", "maida", "flour", "white flour", "all purpose flour"]),
  food("grain-suji", "সুজি", "🌾", "kg", "others", ["suji", "semolina", "sooji"]),
  food("grain-chira", "চিড়া", "🌾", "kg", "others", ["chira", "chire", "flattened rice", "poha"]),
  food("grain-muri", "মুড়ি", "🍘", "kg", "others", ["muri", "puffed rice"]),
  food("grain-khoi", "খই", "🍘", "kg", "others", ["khoi", "popped rice"]),
  food("grain-oats", "ওটস", "🥣", "pack", "others", ["oats", "oatmeal"]),
  food("grain-cornflour", "কর্নফ্লাওয়ার", "🌽", "pack", "others", ["corn flour", "cornflour", "corn starch", "cornstarch"]),

  // Lentils and legumes
  food("dal-masoor", "মসুর ডাল", "🥣", "kg", "dal", ["mosur dal", "moshur dal", "masoor dal", "red lentil", "red lentils"]),
  food("dal-mug", "মুগ ডাল", "🥣", "kg", "dal", ["mug dal", "moog dal", "mung dal", "moong dal", "green gram"]),
  food("dal-chola", "ছোলা ডাল", "🫘", "kg", "dal", ["chola dal", "cholar dal", "chana dal", "split chickpea"]),
  food("dal-mash", "মাষকলাই ডাল", "🫘", "kg", "dal", ["mash dal", "mashkalai dal", "biuli dal", "urad dal", "black gram"]),
  food("dal-arhar", "অড়হর ডাল", "🥣", "kg", "dal", ["arhar dal", "orhor dal", "toor dal", "pigeon pea"]),
  food("dal-motor", "মটর ডাল", "🫛", "kg", "dal", ["motor dal", "matar dal", "pea dal", "split peas"]),
  food("legume-chola", "ছোলা", "🫘", "kg", "others", ["chola", "chana", "chickpea", "chickpeas", "boot"]),
  food("legume-motor", "মটরশুঁটি", "🫛", "kg", "sobji", ["motor shuti", "matar", "peas", "green peas"]),
  food("legume-bean", "শিমের বিচি", "🫘", "kg", "sobji", ["shimer bichi", "bean seed", "beans"]),

  // Oils and cooking fats
  food("oil-soybean", "সয়াবিন তেল", "🫗", "liter", "tel", ["soyabin tel", "soybean oil", "soya oil", "soy oil"]),
  food("oil-mustard", "সরিষার তেল", "🫗", "liter", "tel", ["sorishar tel", "sorisha tel", "mustard oil"]),
  food("oil-sunflower", "সূর্যমুখী তেল", "🌻", "liter", "tel", ["surjomukhi tel", "sunflower oil"]),
  food("oil-olive", "অলিভ অয়েল", "🫒", "liter", "tel", ["olive oil", "oliv oil"]),
  food("oil-coconut", "নারিকেল তেল", "🥥", "liter", "tel", ["narikel tel", "coconut oil"]),
  food("fat-ghee", "ঘি", "🧈", "kg", "others", ["ghi", "ghee", "clarified butter"]),

  // Vegetables and leafy greens
  food("veg-potato", "আলু", "🥔", "kg", "sobji", ["alu", "alo", "aloo", "aalu", "potato", "potatoes"]),
  food("veg-eggplant", "বেগুন", "🍆", "kg", "sobji", ["begun", "begoon", "brinjal", "eggplant", "aubergine"]),
  food("veg-pointed-gourd", "পটল", "🥒", "kg", "sobji", ["potol", "patol", "pointed gourd", "parwal"]),
  food("veg-bitter-gourd", "করলা", "🥒", "kg", "sobji", ["korola", "korla", "karela", "bitter gourd"]),
  food("veg-tomato", "টমেটো", "🍅", "kg", "sobji", ["tomato", "tometo", "tomatto"]),
  food("veg-bottle-gourd", "লাউ", "🥒", "kg", "sobji", ["lau", "lao", "bottle gourd"]),
  food("veg-pumpkin", "মিষ্টি কুমড়া", "🎃", "kg", "sobji", ["misti kumra", "mishti kumra", "kumra", "pumpkin", "sweet pumpkin"]),
  food("veg-ash-gourd", "চাল কুমড়া", "🍈", "kg", "sobji", ["chal kumra", "chalkumra", "ash gourd", "winter melon"]),
  food("veg-ridge-gourd", "ঝিঙ্গা", "🥒", "kg", "sobji", ["jhinga", "jhinge", "zinga", "ridge gourd"]),
  food("veg-snake-gourd", "চিচিঙ্গা", "🥒", "kg", "sobji", ["chichinga", "chichinge", "snake gourd"]),
  food("veg-okra", "ঢেঁড়স", "🥬", "kg", "sobji", ["derosh", "dherosh", "dheros", "bhindi", "okra", "lady finger"]),
  food("veg-long-bean", "বরবটি", "🫛", "kg", "sobji", ["borboti", "barbati", "long bean", "yardlong bean"]),
  food("veg-bean", "শিম", "🫛", "kg", "sobji", ["shim", "sim", "bean", "flat bean", "hyacinth bean"]),
  food("veg-cauliflower", "ফুলকপি", "🥦", "kg", "sobji", ["fulkopi", "phulkopi", "cauliflower"]),
  food("veg-cabbage", "বাঁধাকপি", "🥬", "kg", "sobji", ["badhakopi", "bandhakopi", "badha kopi", "cabbage"]),
  food("veg-carrot", "গাজর", "🥕", "kg", "sobji", ["gajor", "gajur", "carrot"]),
  food("veg-radish", "মুলা", "🥕", "kg", "sobji", ["mula", "mulo", "radish"]),
  food("veg-cucumber", "শসা", "🥒", "kg", "sobji", ["shosha", "sosa", "shasa", "cucumber"]),
  food("veg-green-papaya", "কাঁচা পেঁপে", "🍈", "kg", "sobji", ["kacha pepe", "raw papaya", "green papaya", "pepe"]),
  food("veg-green-banana", "কাঁচা কলা", "🍌", "pcs", "sobji", ["kacha kola", "raw banana", "green banana", "plantain"]),
  food("veg-teasel-gourd", "কাঁকরোল", "🥒", "kg", "sobji", ["kakrol", "kankrol", "teasel gourd", "spiny gourd"]),
  food("veg-taro-root", "কচুর মুখী", "🥔", "kg", "sobji", ["kochur mukhi", "mukhi kochu", "taro root", "arbi"]),
  food("veg-taro-stem", "কচুর লতি", "🌿", "kg", "sobji", ["kochur loti", "kochu loti", "taro stem"]),
  food("veg-red-amaranth", "লাল শাক", "🥬", "bundle", "sobji", ["lal shak", "lal sak", "red spinach", "red amaranth"]),
  food("veg-spinach", "পালং শাক", "🥬", "bundle", "sobji", ["palong shak", "palong", "spinach"]),
  food("veg-malabar-spinach", "পুঁই শাক", "🥬", "bundle", "sobji", ["pui shak", "pui sak", "pui", "malabar spinach"]),
  food("veg-water-spinach", "কলমি শাক", "🥬", "bundle", "sobji", ["kolmi shak", "kolmi sak", "kolmi", "water spinach"]),
  food("veg-bottle-gourd-leaf", "লাউ শাক", "🥬", "bundle", "sobji", ["lau shak", "lao shak", "gourd leaf"]),
  food("veg-data", "ডাটা", "🌿", "bundle", "sobji", ["data", "danta", "amaranth stem", "vegetable stem"]),
  food("veg-coriander-leaf", "ধনেপাতা", "🌿", "bundle", "sobji", ["dhonepata", "dhonia pata", "dhoniapata", "coriander leaf", "cilantro"]),
  food("veg-mint", "পুদিনাপাতা", "🌿", "bundle", "sobji", ["pudina pata", "pudina", "mint", "mint leaf"]),
  food("veg-lemon", "লেবু", "🍋", "pcs", "sobji", ["lebu", "lemon", "lime"]),
  food("veg-broccoli", "ব্রকলি", "🥦", "kg", "sobji", ["broccoli", "brocoli"]),
  food("veg-capsicum", "ক্যাপসিকাম", "🫑", "kg", "sobji", ["capsicum", "bell pepper", "sweet pepper"]),
  food("veg-corn", "ভুট্টা", "🌽", "pcs", "sobji", ["vutta", "bhutta", "corn", "maize", "sweet corn"]),
  food("veg-mushroom", "মাশরুম", "🍄", "pack", "sobji", ["mushroom", "mashroom"]),
  food("veg-raw-jackfruit", "কাঁচা কাঁঠাল", "🍈", "kg", "sobji", ["kacha kathal", "raw jackfruit", "green jackfruit", "echor"]),

  // Onion, garlic, and chilli
  food("onion-red", "পেঁয়াজ", "🧅", "kg", "peyaj", ["peyaj", "piyaj", "piaz", "onion", "red onion"]),
  food("onion-spring", "পেঁয়াজ পাতা", "🌿", "bundle", "peyaj", ["peyaj pata", "spring onion", "green onion", "scallion"]),
  food("garlic", "রসুন", "🧄", "kg", "rosun", ["rosun", "roshun", "rasun", "garlic"]),
  food("chilli-green", "কাঁচা মরিচ", "🌶️", "kg", "morich", ["kacha morich", "kancha morich", "green chili", "green chilli"]),
  food("chilli-dry", "শুকনা মরিচ", "🌶️", "kg", "morich", ["shukna morich", "sukna morich", "dry chili", "dried chilli", "red chili"]),

  // Fish and seafood
  food("fish-rui", "রুই", "🐟", "kg", "mach", ["rui", "ruhi", "rohu", "rui fish"]),
  food("fish-katla", "কাতলা", "🐟", "kg", "mach", ["katla", "catla", "katla fish"]),
  food("fish-tilapia", "তেলাপিয়া", "🐟", "kg", "mach", ["tilapia", "telapiya", "telapia", "talapia"]),
  food("fish-ilish", "ইলিশ", "🐟", "kg", "mach", ["ilish", "elish", "hilsa", "hilsha"]),
  food("fish-pangas", "পাঙ্গাস", "🐟", "kg", "mach", ["pangash", "pangas", "pangasius"]),
  food("fish-shrimp", "চিংড়ি", "🦐", "kg", "mach", ["chingri", "chingdi", "shrimp", "prawn"]),
  food("fish-koi", "কই", "🐟", "kg", "mach", ["koi", "climbing perch"]),
  food("fish-shing", "শিং", "🐟", "kg", "mach", ["shing", "sing", "stinging catfish"]),
  food("fish-magur", "মাগুর", "🐟", "kg", "mach", ["magur", "walking catfish"]),
  food("fish-pabda", "পাবদা", "🐟", "kg", "mach", ["pabda", "pabda fish"]),
  food("fish-boal", "বোয়াল", "🐟", "kg", "mach", ["boal", "wallago", "boal fish"]),
  food("fish-mrigel", "মৃগেল", "🐟", "kg", "mach", ["mrigel", "mrigal", "mrigel fish"]),
  food("fish-rupchanda", "রূপচাঁদা", "🐟", "kg", "mach", ["rupchanda", "rupchada", "pomfret"]),
  food("fish-tengra", "টেংরা", "🐟", "kg", "mach", ["tengra", "tangra", "tengra fish"]),
  food("fish-shol", "শোল", "🐟", "kg", "mach", ["shol", "snakehead fish"]),
  food("fish-chital", "চিতল", "🐟", "kg", "mach", ["chital", "chitol", "clown knifefish"]),
  food("fish-puti", "পুঁটি", "🐟", "kg", "mach", ["puti", "punti", "barb fish"]),
  food("fish-kachki", "কাচকি", "🐟", "kg", "mach", ["kachki", "small fish"]),
  food("fish-bata", "বাটা", "🐟", "kg", "mach", ["bata", "bata fish"]),
  food("fish-koral", "কোরাল", "🐟", "kg", "mach", ["koral", "bhetki", "sea bass", "barramundi"]),
  food("fish-salmon", "স্যালমন", "🐟", "kg", "mach", ["salmon", "salman fish"]),
  food("fish-tuna", "টুনা", "🐟", "can", "mach", ["tuna", "tuna fish"]),
  food("fish-crab", "কাঁকড়া", "🦀", "kg", "mach", ["kakra", "kankra", "crab"]),

  // Meat and eggs
  food("meat-chicken", "মুরগি", "🍗", "kg", "mangsho", ["murgi", "morog", "chicken", "chiken"]),
  food("meat-beef", "গরুর মাংস", "🥩", "kg", "mangsho", ["গরু", "goru", "gorur mangsho", "beef", "cow meat"]),
  food("meat-mutton", "খাসির মাংস", "🥩", "kg", "mangsho", ["khasi", "khashi", "khasir mangsho", "mutton", "goat meat"]),
  food("meat-duck", "হাঁসের মাংস", "🦆", "kg", "mangsho", ["hash", "hasher mangsho", "duck", "duck meat"]),
  food("meat-pigeon", "কবুতরের মাংস", "🍗", "pcs", "mangsho", ["kobutor", "kobutorer mangsho", "pigeon meat"]),
  food("meat-liver", "কলিজা", "🥩", "kg", "mangsho", ["kolija", "liver", "beef liver", "chicken liver"]),
  food("egg-chicken", "মুরগির ডিম", "🥚", "pcs", "dim", ["murgir dim", "chicken egg", "egg", "dim"]),
  food("egg-duck", "হাঁসের ডিম", "🥚", "pcs", "dim", ["hasher dim", "hash er dim", "duck egg"]),
  food("egg-quail", "কোয়েলের ডিম", "🥚", "pcs", "dim", ["quail egg", "koyeler dim", "koel dim"]),

  // Spices, seasonings, salt, and sugar
  food("spice-cumin", "জিরা", "🫙", "gram", "mosla", ["jira", "jeera", "cumin", "cumin seed"]),
  food("spice-cumin-powder", "জিরা গুঁড়া", "🫙", "pack", "mosla", ["jira gura", "jira powder", "cumin powder"]),
  food("spice-turmeric", "হলুদ গুঁড়া", "🫙", "pack", "mosla", ["holud gura", "halud gura", "turmeric", "turmeric powder"]),
  food("spice-chilli-powder", "মরিচ গুঁড়া", "🌶️", "pack", "mosla", ["morich gura", "chili powder", "chilli powder", "red chili powder"]),
  food("spice-coriander", "ধনিয়া গুঁড়া", "🫙", "pack", "mosla", ["dhonia gura", "dhania powder", "coriander powder"]),
  food("spice-garam", "গরম মসলা", "🫙", "pack", "mosla", ["gorom mosla", "garam masala", "garam mosla"]),
  food("spice-black-pepper", "গোলমরিচ", "⚫", "gram", "mosla", ["golmorich", "black pepper", "pepper"]),
  food("spice-cinnamon", "দারুচিনি", "🪵", "gram", "mosla", ["daruchini", "dalchini", "cinnamon"]),
  food("spice-cardamom", "এলাচ", "🫙", "gram", "mosla", ["elach", "elaichi", "cardamom"]),
  food("spice-clove", "লবঙ্গ", "🫙", "gram", "mosla", ["lobongo", "labanga", "clove"]),
  food("spice-bay-leaf", "তেজপাতা", "🍃", "gram", "mosla", ["tejpata", "tej pata", "bay leaf"]),
  food("spice-ginger", "আদা", "🫚", "kg", "mosla", ["ada", "ginger"]),
  food("spice-panch-phoron", "পাঁচ ফোড়ন", "🫙", "pack", "mosla", ["pach foron", "panch phoron", "five spice"]),
  food("spice-mustard-seed", "সরিষা", "🫙", "gram", "mosla", ["sorisha", "mustard seed", "rai"]),
  food("spice-chicken-masala", "মুরগির মসলা", "🫙", "pack", "mosla", ["murgir mosla", "chicken masala", "chicken spice"]),
  food("spice-fish-masala", "মাছের মসলা", "🫙", "pack", "mosla", ["macher mosla", "fish masala", "fish spice"]),
  food("spice-biryani-masala", "বিরিয়ানি মসলা", "🫙", "pack", "mosla", ["biriyani mosla", "biryani masala", "biriani masala"]),
  food("seasoning-salt", "লবণ", "🧂", "kg", "others", ["lobon", "labon", "salt"]),
  food("seasoning-sugar", "চিনি", "🍬", "kg", "others", ["chini", "sugar", "white sugar"]),
  food("seasoning-jaggery", "গুড়", "🍯", "kg", "others", ["gur", "gud", "jaggery", "molasses"]),
  food("seasoning-vinegar", "ভিনেগার", "🍶", "bottle", "others", ["vinegar", "vineger"]),
  food("seasoning-soy-sauce", "সয়া সস", "🥫", "bottle", "others", ["soya sauce", "soy sauce"]),
  food("seasoning-ketchup", "টমেটো সস", "🥫", "bottle", "others", ["tomato sauce", "ketchup", "tomato ketchup"]),
  food("seasoning-mayonnaise", "মেয়োনিজ", "🥫", "bottle", "others", ["mayonnaise", "mayo", "mayonise"]),

  // Milk and dairy
  food("dairy-milk", "দুধ", "🥛", "liter", "others", ["dudh", "doodh", "milk", "cow milk"]),
  food("dairy-powder-milk", "গুঁড়া দুধ", "🥛", "pack", "others", ["gura dudh", "powder milk", "milk powder"]),
  food("dairy-yogurt", "দই", "🥣", "kg", "others", ["doi", "yogurt", "yoghurt", "curd"]),
  food("dairy-butter", "মাখন", "🧈", "pack", "others", ["makhon", "butter"]),
  food("dairy-cheese", "চিজ", "🧀", "pack", "others", ["cheese", "chiz"]),
  food("dairy-cream", "ক্রিম", "🥛", "pack", "others", ["cream", "fresh cream"]),
  food("dairy-condensed-milk", "কনডেন্সড মিল্ক", "🥫", "can", "others", ["condensed milk", "condense milk"]),

  // Fruits
  food("fruit-banana", "কলা", "🍌", "dozen", "others", ["kola", "banana", "bananas"]),
  food("fruit-apple", "আপেল", "🍎", "kg", "others", ["apel", "apple", "apples"]),
  food("fruit-orange", "কমলা", "🍊", "kg", "others", ["komola", "orange", "oranges"]),
  food("fruit-malta", "মাল্টা", "🍊", "kg", "others", ["malta", "sweet orange"]),
  food("fruit-mango", "আম", "🥭", "kg", "others", ["aam", "am", "mango", "mangoes"]),
  food("fruit-guava", "পেয়ারা", "🍐", "kg", "others", ["peyara", "payara", "guava"]),
  food("fruit-papaya", "পাকা পেঁপে", "🍈", "kg", "others", ["paka pepe", "papaya", "ripe papaya"]),
  food("fruit-pineapple", "আনারস", "🍍", "pcs", "others", ["anaros", "anaras", "pineapple"]),
  food("fruit-watermelon", "তরমুজ", "🍉", "kg", "others", ["tormuj", "tarmuj", "watermelon"]),
  food("fruit-grapes", "আঙুর", "🍇", "kg", "others", ["angur", "grape", "grapes"]),
  food("fruit-pomegranate", "ডালিম", "🍎", "kg", "others", ["dalim", "anar", "pomegranate"]),
  food("fruit-coconut", "নারিকেল", "🥥", "pcs", "others", ["narikel", "coconut"]),
  food("fruit-date", "খেজুর", "🌴", "kg", "others", ["khejur", "date", "dates"]),
  food("fruit-jackfruit", "কাঁঠাল", "🍈", "pcs", "others", ["kathal", "jackfruit"]),
  food("fruit-lychee", "লিচু", "🍒", "hundred", "others", ["lichu", "litchi", "lychee"]),
  food("fruit-pear", "নাশপাতি", "🍐", "kg", "others", ["nashpati", "pear"]),
  food("fruit-dragon", "ড্রাগন ফল", "🐉", "kg", "others", ["dragon fruit", "dragon fol"]),

  // Bread, breakfast, noodles, and snacks
  food("bakery-bread", "পাউরুটি", "🍞", "pack", "others", ["pauruti", "paw ruti", "bread", "loaf"]),
  food("bakery-bun", "বান রুটি", "🥯", "pcs", "others", ["bun ruti", "bun", "bread bun"]),
  food("bakery-biscuit", "বিস্কুট", "🍪", "pack", "others", ["biscuit", "biskut", "cookies", "cookie"]),
  food("bakery-cake", "কেক", "🍰", "pcs", "others", ["cake", "birthday cake"]),
  food("breakfast-cereal", "কর্নফ্লেক্স", "🥣", "pack", "others", ["cornflakes", "corn flakes", "cereal"]),
  food("instant-noodles", "নুডলস", "🍜", "pack", "others", ["noodles", "noodle", "nuduls", "instant noodles"]),
  food("pasta", "পাস্তা", "🍝", "pack", "others", ["pasta", "macaroni", "macaroni pasta"]),
  food("vermicelli", "সেমাই", "🍜", "pack", "others", ["semai", "shemai", "vermicelli"]),
  food("chanachur", "চানাচুর", "🥨", "pack", "others", ["chanachur", "chanachor", "snack mix"]),
  food("chips", "চিপস", "🍟", "pack", "others", ["chips", "potato chips"]),
  food("popcorn", "পপকর্ন", "🍿", "pack", "others", ["popcorn", "pop corn"]),
  food("chocolate", "চকলেট", "🍫", "pcs", "others", ["chocolate", "choclate"]),

  // Tea, drinks, and water
  food("drink-tea", "চা পাতা", "🍵", "pack", "others", ["cha pata", "tea", "tea leaf", "tea leaves"]),
  food("drink-coffee", "কফি", "☕", "pack", "others", ["coffee", "cofee"]),
  food("drink-water", "পানি", "💧", "liter", "others", ["pani", "water", "drinking water", "mineral water"]),
  food("drink-juice", "ফলের জুস", "🧃", "pack", "others", ["foler juice", "fruit juice", "juice"]),
  food("drink-soft", "কোমল পানীয়", "🥤", "bottle", "others", ["soft drink", "cold drink", "soda", "coke"]),
  food("drink-coconut-water", "ডাব", "🥥", "pcs", "others", ["dab", "coconut water", "green coconut"]),

  // Nuts and dried food
  food("nut-peanut", "চিনাবাদাম", "🥜", "kg", "others", ["china badam", "chinabadam", "peanut", "groundnut"]),
  food("nut-cashew", "কাজুবাদাম", "🥜", "kg", "others", ["kaju badam", "cashew", "cashew nut"]),
  food("nut-almond", "কাঠবাদাম", "🌰", "kg", "others", ["kath badam", "almond", "almonds"]),
  food("dried-raisin", "কিশমিশ", "🍇", "kg", "others", ["kishmish", "raisin", "raisins"]),
  food("seed-sesame", "তিল", "🌱", "kg", "others", ["til", "sesame", "sesame seed"]),

  // Frozen and ready-to-cook foods
  food("frozen-paratha", "ফ্রোজেন পরোটা", "🫓", "pack", "others", ["frozen porota", "frozen paratha", "paratha"]),
  food("frozen-singara", "ফ্রোজেন সিঙ্গারা", "🥟", "pack", "others", ["frozen singara", "samosa"]),
  food("frozen-nuggets", "চিকেন নাগেট", "🍗", "pack", "others", ["chicken nugget", "chicken nuggets", "nuggets"]),
  food("frozen-sausage", "সসেজ", "🌭", "pack", "others", ["sausage", "sausages"]),
];

export function normalizeBazarFoodSearch(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0981\u200B-\u200D\uFEFF]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= b.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

export function getBazarFoodSearchScore(item, rawQuery) {
  const query = normalizeBazarFoodSearch(rawQuery);
  if (!query) return Number.POSITIVE_INFINITY;
  const name = normalizeBazarFoodSearch(item?.name);
  const aliases = (item?.aliases || []).map(normalizeBazarFoodSearch).filter(Boolean);
  const terms = [name, ...aliases];

  if (name === query) return 0;
  if (aliases.includes(query)) return 1;
  if (name.startsWith(query)) return 2;
  if (aliases.some((term) => term.startsWith(query))) return 3;
  if (terms.some((term) => term.split(" ").some((word) => word.startsWith(query)))) return 4;
  if (terms.some((term) => term.includes(query))) return 5;

  const queryTokens = query.split(" ");
  if (queryTokens.length > 1 && terms.some((term) => queryTokens.every((token) => term.includes(token)))) {
    return 6;
  }

  if (/^[a-z0-9 ]+$/i.test(query) && query.length >= 4) {
    const maxDistance = query.length >= 8 ? 2 : 1;
    const closest = Math.min(
      ...terms.flatMap((term) => [term, ...term.split(" ")]).map((term) => editDistance(term, query)),
    );
    if (closest <= maxDistance) return 7 + closest;
  }

  return Number.POSITIVE_INFINITY;
}

export function searchBazarFoodCatalog(query, limit = 14) {
  const normalized = normalizeBazarFoodSearch(query);
  if (!normalized) return [];
  return BAZAR_FOOD_CATALOG
    .map((item, catalogIndex) => ({
      item,
      catalogIndex,
      score: getBazarFoodSearchScore(item, normalized),
    }))
    .filter((result) => Number.isFinite(result.score))
    .sort((a, b) => a.score - b.score || a.catalogIndex - b.catalogIndex)
    .slice(0, limit)
    .map((result) => ({ ...result.item, searchScore: result.score }));
}

export function findBazarFoodCatalogItem(value) {
  const normalized = normalizeBazarFoodSearch(value);
  if (!normalized) return null;
  const withoutCategory = normalized
    .replace(/^(সবজি|মাছ|মাংস|মসলা)\s+/, "")
    .trim();
  return BAZAR_FOOD_CATALOG.find((item) => {
    const terms = [item.name, ...(item.aliases || [])].map(normalizeBazarFoodSearch);
    return terms.some((term) => term === normalized || term === withoutCategory);
  }) || null;
}

const BAZAR_HISTORY_CATEGORY_TERMS = {
  chal: ["চাল", "chal", "chaal", "rice", "chawl"],
  dal: ["ডাল", "dal", "daal", "lentil", "lentils"],
  tel: ["তেল", "tel", "oil", "cooking oil"],
  sobji: ["সবজি", "sobji", "shobji", "vegetable", "vegetables", "veg", "veggie", "veggies", "tarkari", "torkari"],
  mangsho: ["মাংস", "mangsho", "mangso", "meat", "gosht", "gosto"],
  mach: ["মাছ", "mach", "maach", "fish"],
  dim: ["ডিম", "dim", "deem", "egg", "eggs"],
  mosla: ["মসলা", "মশলা", "mosla", "moshla", "masala", "spice", "spices"],
  peyaj: ["পেঁয়াজ", "পেঁয়াজ", "পেয়াজ", "পিয়াজ", "peyaj", "piyaj", "piaz", "peaj", "onion", "onions"],
  morich: ["মরিচ", "morich", "marich", "chili", "chilli", "chillies", "pepper"],
  rosun: ["রসুন", "rosun", "roshun", "rasun", "garlic"],
};

const BAZAR_UNIT_NOISE = new Set([
  "kg", "kilogram", "gram", "gm", "g", "liter", "litre", "l", "ml",
  "pcs", "pc", "piece", "pieces", "pack", "packet", "tray", "dozen",
  "bundle", "ati", "bottle", "can", "box", "ta", "ti",
]);

function extractItemNamesFromRaw(rawItems) {
  let list = Array.isArray(rawItems) ? rawItems : null;
  if (!list && typeof rawItems === "string") {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      return rawItems
        .split(/[,;\n]+/)
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  if (!list) return [];
  return list
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (!entry || typeof entry !== "object") return "";
      const val = entry.item ?? entry.name ?? entry.title;
      return String(typeof val === "string" ? val : (val?.name ?? val?.item ?? "")).trim();
    })
    .filter(Boolean);
}

const NORMALIZED_CATALOG_INDEX = BAZAR_FOOD_CATALOG.map((item) => {
  const terms = [item.name, ...(item.aliases || [])]
    .map(normalizeBazarFoodSearch)
    .filter(Boolean);
  return {
    id: item.id,
    parentId: item.parentId,
    terms,
    termWords: Array.from(new Set(terms.flatMap((t) => t.split(" ")))).filter(Boolean),
  };
});

const NORMALIZED_CATEGORY_ENTRIES = Object.entries(BAZAR_HISTORY_CATEGORY_TERMS).map(
  ([parentId, rawTerms]) => ({
    parentId,
    terms: rawTerms.map(normalizeBazarFoodSearch).filter(Boolean),
  }),
);

function hasWholePhrase(haystack, phrase) {
  if (!haystack || !phrase) return false;
  if (haystack === phrase) return true;
  if (!haystack.includes(phrase)) return false;
  const hayWords = haystack.split(" ");
  const phraseWords = phrase.split(" ");
  if (phraseWords.length === 1) return hayWords.includes(phraseWords[0]);
  for (let i = 0; i <= hayWords.length - phraseWords.length; i += 1) {
    let ok = true;
    for (let j = 0; j < phraseWords.length; j += 1) {
      if (hayWords[i + j] !== phraseWords[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function resolveEntrySearchSignals(rawItems) {
  const catalogMatches = new Set();
  const groupMatches = new Set();
  const names = extractItemNamesFromRaw(rawItems);

  for (const rawName of names) {
    // Strip trailing "(2 kg)" or quantity/price suffix while preserving base food words
    const stripped = String(rawName || "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/৳\s*[\d.,]+/g, " ")
      .trim();
    const parts = stripped
      .split(/\s*[-–:]\s*/)
      .map(normalizeBazarFoodSearch)
      .filter(Boolean);
    const fullNorm = normalizeBazarFoodSearch(stripped);
    const filteredFull = fullNorm
      .split(" ")
      .filter((w) => w && !BAZAR_UNIT_NOISE.has(w) && !/^\d+(?:\.\d+)?$/.test(w))
      .join(" ");

    const candidates = Array.from(new Set([fullNorm, filteredFull, ...parts].filter(Boolean)));
    const words = Array.from(
      new Set(
        candidates
          .flatMap((c) => c.split(" "))
          .filter((w) => w && !BAZAR_UNIT_NOISE.has(w) && !/^\d+(?:\.\d+)?$/.test(w)),
      ),
    );

    for (const cat of NORMALIZED_CATALOG_INDEX) {
      const hit = candidates.some((cand) =>
        cat.terms.some((term) => hasWholePhrase(cand, term)),
      ) || words.some((word) => word.length >= 2 && cat.terms.includes(word));
      if (hit) {
        catalogMatches.add(cat.id);
        if (cat.parentId && cat.parentId !== "others") groupMatches.add(cat.parentId);
      }
    }

    for (const grp of NORMALIZED_CATEGORY_ENTRIES) {
      const hit = candidates.some((cand) =>
        grp.terms.some((term) => hasWholePhrase(cand, term)),
      ) || words.some((word) => word.length >= 2 && grp.terms.includes(word));
      if (hit) {
        groupMatches.add(grp.parentId);
      }
    }
  }

  return { catalogMatches, groupMatches };
}

/** Match monthly bazar history entries across English, Banglish, Bangla, and minor spelling typos. */
export function matchesBazarHistorySearch(rawItems, rawQuery, extraText = "") {
  const query = normalizeBazarFoodSearch(rawQuery);
  if (!query) return true;

  const summary = extractItemNamesFromRaw(rawItems).join(", ");
  const normalizedHaystack = normalizeBazarFoodSearch(`${summary} ${extraText}`);
  if (normalizedHaystack.includes(query)) return true;

  const queryTokens = query.split(" ").filter(Boolean);
  if (queryTokens.length > 1 && queryTokens.every((tok) => normalizedHaystack.includes(tok))) {
    return true;
  }

  if (query.length < 2) return false;

  const { catalogMatches, groupMatches } = resolveEntrySearchSignals(rawItems);
  if (!catalogMatches.size && !groupMatches.size) return false;

  // Resolve what the user's query refers to across food catalog (includes Banglish, English, Bangla & typo tolerance)
  const queryCatalogHits = searchBazarFoodCatalog(query, 30);
  if (queryCatalogHits.some((hit) => catalogMatches.has(hit.id))) {
    return true;
  }

  // Match category-level queries (e.g. "rice", "chal", "oil", "tel", "egg", "vegetable", "sobji", "fish", "mach")
  for (const grp of NORMALIZED_CATEGORY_ENTRIES) {
    if (!groupMatches.has(grp.parentId)) continue;
    const grpHit = grp.terms.some(
      (term) =>
        term === query ||
        term.startsWith(query) ||
        term.split(" ").some((word) => word.startsWith(query)) ||
        (/^[a-z0-9 ]+$/i.test(query) &&
          query.length >= 4 &&
          Math.min(
            ...grp.terms
              .filter((t) => /^[a-z0-9 ]+$/i.test(t))
              .flatMap((t) => [t, ...t.split(" ")])
              .map((t) => editDistance(t, query)),
          ) <= (query.length >= 8 ? 2 : 1)),
    );
    if (grpHit) return true;
  }

  // Fallback: check individual query tokens if user entered multi-word query (e.g. "red potato")
  if (queryTokens.length > 1) {
    const meaningfulTokens = queryTokens.filter((tok) => tok.length >= 2 && !BAZAR_UNIT_NOISE.has(tok));
    if (meaningfulTokens.length > 0) {
      return meaningfulTokens.every((tok) => matchesBazarHistorySearch(rawItems, tok, extraText));
    }
  }

  return false;
}
