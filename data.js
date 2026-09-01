// PicaPool intent form — data model.
// Ported verbatim (content/order/logic) from PicaPool Intent Form.dc.html.
"use strict";

function optOut(label) { return { id: "none", label: label, optOut: true }; }
function otherOpt(label, placeholder) { return { id: "other", label: label, needsInput: true, placeholder: placeholder }; }

var FREQ_OPTIONS = [
  { id: "daily", label: "Almost every day" },
  { id: "few_week", label: "A few times a week" },
  { id: "once_week", label: "About once a week" },
  { id: "rarely", label: "Rarely" },
];

var FAST_FOOD_STEPS = [
  { key: "pizza", section: "Fast Food", kind: "question", multi: true, layout: "grid2", icon: "pizza",
    title: "Which pizza do you order most?",
    sub: "Pick as many as you like.",
    options: [{ id: "dominos", label: "Domino's" }, { id: "lapinoz", label: "La Pino'z" }, { id: "pizzahut", label: "Pizza Hut" }, optOut("Don't eat pizza")] },
  { key: "burger", section: "Fast Food", kind: "question", multi: true, layout: "grid2", icon: "burger",
    title: "Go-to burger?",
    sub: "Pick as many as you like.",
    options: [{ id: "mcd", label: "McDonald's" }, { id: "bk", label: "Burger King" }, otherOpt("A local favourite", "Which one?"), optOut("Don't eat burgers")] },
  { key: "outside_other", section: "Fast Food", kind: "question", multi: true, layout: "grid2", icon: "takeout",
    title: "What else do you eat outside?",
    sub: "Pick as many as you like.",
    options: [{ id: "biryani", label: "Biryani" }, { id: "indochinese", label: "Indo-Chinese / Rolls" }, { id: "mexican", label: "Mexican / Tacos" }, { id: "friedchicken", label: "Fried Chicken" }] },
  { key: "outside_freq", section: "Fast Food", kind: "question", layout: "column", icon: "clock", endOfSection: true,
    title: "How often do you eat or order outside?",
    options: FREQ_OPTIONS },
];

var QUICK_COMMERCE_STEPS = [
  { key: "chips", section: "Quick Commerce", kind: "question", multi: true, layout: "grid2", icon: "chips",
    title: "Favourite chips?",
    sub: "Pick as many as you like.",
    options: [{ id: "lays", label: "Lay's" }, { id: "kurkure", label: "Kurkure" }, { id: "bingo", label: "Bingo" }, optOut("Don't eat chips")] },
  { key: "cold_drink", section: "Quick Commerce", kind: "question", multi: true, layout: "grid2", icon: "soda",
    title: "Go-to cold drink?",
    sub: "Pick as many as you like.",
    options: [{ id: "coke", label: "Coca-Cola" }, { id: "thumsup", label: "Thums Up" }, { id: "pepsi", label: "Pepsi" }, { id: "sprite", label: "Sprite / Limca" }, optOut("Don't drink soda")] },
  { key: "biscuits", section: "Quick Commerce", kind: "question", multi: true, layout: "grid2", icon: "biscuit",
    title: "Favourite biscuits?",
    sub: "Pick as many as you like.",
    options: [{ id: "britannia", label: "Britannia" }, { id: "oreo", label: "Oreo" }, { id: "jimjam", label: "Jim Jam" }, { id: "hideseek", label: "Hide & Seek" }, optOut("Don't eat biscuits")] },
  { key: "choco_wafer", section: "Quick Commerce", kind: "question", multi: true, layout: "grid2", icon: "chocolate",
    title: "Chocolate or wafer you reach for?",
    sub: "Pick as many as you like.",
    options: [{ id: "kitkat", label: "KitKat" }, { id: "dairymilk", label: "Dairy Milk" }, { id: "munch", label: "Munch" }, { id: "perk", label: "Perk" }, optOut("Don't eat these")] },
  { key: "qc_freq", section: "Quick Commerce", kind: "question", layout: "column", icon: "clock", endOfSection: true,
    title: "How often do you order this kind of stuff?",
    options: FREQ_OPTIONS },
];

var INSTANT_FOOD_STEPS = [
  { key: "noodles", section: "Instant Food", kind: "question", multi: true, layout: "grid2", icon: "noodles",
    title: "Instant noodles you cook most?",
    sub: "Pick as many as you like.",
    options: [{ id: "maggi", label: "Maggi" }, { id: "yippee", label: "Yippee" }, { id: "chings", label: "Ching's" }, optOut("Don't eat instant noodles")] },
  { key: "oats", section: "Instant Food", kind: "question", multi: true, layout: "grid2", icon: "oats",
    title: "Oats or cereal you buy?",
    sub: "Pick as many as you like.",
    options: [{ id: "quaker", label: "Quaker" }, { id: "saffola", label: "Saffola" }, { id: "kelloggs", label: "Kellogg's" }, optOut("Don't eat this")] },
  { key: "peanut_butter", section: "Instant Food", kind: "question", multi: true, layout: "grid2", icon: "peanutbutter", endOfSection: true,
    title: "Peanut butter brand?",
    sub: "Pick as many as you like.",
    options: [{ id: "pintola", label: "Pintola" }, { id: "sundrop", label: "Sundrop" }, { id: "myfitness", label: "MyFitness" }, optOut("Don't eat peanut butter")] },
];

var BEVERAGES_STEPS = [
  { key: "tea_coffee", section: "Beverages", kind: "question", layout: "grid3", icon: "tea", endOfSection: true,
    title: "Tea, coffee, or both?",
    options: [{ id: "tea", label: "Tea" }, { id: "coffee", label: "Coffee" }, { id: "both", label: "Both" }] },
];

var LAUNDRY_STEPS = [
  { key: "detergent", section: "Laundry & Toothpaste", kind: "question", multi: true, layout: "column", icon: "detergent",
    title: "Detergent you'd stock up on?",
    sub: "Pick as many as you like.",
    options: [{ id: "premium_powder", label: "Premium Powder" }, { id: "budget_powder", label: "Budget Powder" }, { id: "liquid", label: "Liquid Detergent" }, { id: "any", label: "Any — doesn't matter" }] },
  { key: "toothpaste", section: "Laundry & Toothpaste", kind: "question", multi: true, layout: "column", icon: "toothpaste", endOfSection: true,
    title: "Toothpaste you use?",
    sub: "Pick as many as you like.",
    options: [{ id: "colgate", label: "Colgate" }, { id: "pepsodent", label: "Pepsodent" }, { id: "closeup", label: "Closeup" }, optOut("Other / doesn't matter")] },
];

var SUPPLEMENTS_STEPS = [
  { key: "sup_protein", section: "Supplements", kind: "question", multi: true, layout: "grid2", icon: "protein",
    title: "Protein brand you use?",
    sub: "Pick as many as you like.",
    options: [{ id: "muscleblaze", label: "MuscleBlaze" }, { id: "on", label: "Optimum Nutrition" }, { id: "myprotein", label: "MyProtein" }, optOut("Don't use protein")] },
  { key: "sup_creatine", section: "Supplements", kind: "question", multi: true, layout: "grid2", icon: "creatine", endOfSection: true,
    title: "Creatine brand?",
    sub: "Pick as many as you like.",
    options: [{ id: "muscleblaze_c", label: "MuscleBlaze" }, { id: "on_c", label: "Optimum Nutrition" }, { id: "avvatar", label: "Avvatar" }, optOut("Don't use creatine")] },
];

var SKINCARE_STEPS = [
  { key: "sunscreen", section: "Skincare", kind: "question", multi: true, layout: "grid2", icon: "sunscreen",
    title: "Sunscreen you'd repurchase?",
    sub: "Pick as many as you like.",
    options: [{ id: "minimalist", label: "Minimalist" }, { id: "dermaco", label: "The Derma Co" }, { id: "himalaya", label: "Himalaya" }, { id: "cetaphil", label: "Cetaphil" }, optOut("Don't use sunscreen")] },
  { key: "facewash", section: "Skincare", kind: "question", multi: true, layout: "column", icon: "facewash",
    title: "Facewash you use?",
    sub: "Pick as many as you like.",
    options: [{ id: "cetaphil_f", label: "Cetaphil" }, { id: "himalaya_f", label: "Himalaya" }, { id: "neutrogena", label: "Neutrogena" }, { id: "plum", label: "Plum" }, { id: "minimalist_f", label: "Minimalist" }, otherOpt("Other", "Which one?")] },
  { key: "moisturizer", section: "Skincare", kind: "question", multi: true, layout: "grid2", icon: "moisturizer", endOfSection: true,
    title: "Moisturiser you'd stock up on?",
    sub: "Pick as many as you like.",
    options: [{ id: "cetaphil_m", label: "Cetaphil" }, { id: "minimalist_m", label: "Minimalist" }, { id: "nivea", label: "Nivea" }, { id: "ponds", label: "Pond's" }, optOut("Don't use moisturiser")] },
];

var COOKING_STEPS = [
  { key: "oil_ghee", section: "Cooking", kind: "question", multi: true, layout: "grid2", icon: "oil",
    title: "Oil or ghee you buy?",
    sub: "Pick as many as you like.",
    options: [{ id: "fortune", label: "Fortune" }, { id: "saffola_o", label: "Saffola" }, { id: "amul", label: "Amul" }, otherOpt("Other", "Which one?")] },
  { key: "masala", section: "Cooking", kind: "question", multi: true, layout: "grid2", icon: "masala",
    title: "Masala brand?",
    sub: "Pick as many as you like.",
    options: [{ id: "mdh", label: "MDH" }, { id: "everest", label: "Everest" }, { id: "catch", label: "Catch" }, otherOpt("Other", "Which one?")] },
  { key: "atta_rice", section: "Cooking", kind: "question", multi: true, layout: "grid2", icon: "atta", endOfSection: true,
    title: "Atta or rice you'd stock up on?",
    sub: "Pick as many as you like.",
    options: [{ id: "aashirvaad", label: "Aashirvaad" }, { id: "fortune_a", label: "Fortune" }, { id: "indiagate", label: "India Gate" }, otherOpt("Other", "Which one?")] },
];

var FINAL_CHIPS = ["Rice", "Cooking oil", "Coffee", "Snacks", "Detergent", "Skincare"];

function buildInitialSteps() {
  return [
    { key: "intro", kind: "intro" },
    { key: "notice", kind: "notice" },
    { key: "transition", kind: "transition" },
  ].concat(FAST_FOOD_STEPS, QUICK_COMMERCE_STEPS, [
    { key: "checkpoint", kind: "names" },
  ], INSTANT_FOOD_STEPS, BEVERAGES_STEPS, LAUNDRY_STEPS, [
    { key: "interests", kind: "question", multi: true, layout: "grid3", icon: "gate", section: "A few more things",
      title: "Want in on any of these too?",
      sub: "Pick as many as you like — we'll only ask about what you choose.",
      options: [
        { id: "supplements", label: "Supplements", icon: "protein" },
        { id: "skincare", label: "Skincare", icon: "droplet" },
        { id: "cooking", label: "Cooking", icon: "pan" },
      ] },
    { key: "final_ask", kind: "final" },
    { key: "end", kind: "end" },
  ]);
}

function buildBranchSteps(selected) {
  var order = ["supplements", "skincare", "cooking"];
  var map = { supplements: SUPPLEMENTS_STEPS, skincare: SKINCARE_STEPS, cooking: COOKING_STEPS };
  var out = [];
  order.forEach(function (k) { if (selected.indexOf(k) !== -1) out = out.concat(map[k]); });
  return out;
}
