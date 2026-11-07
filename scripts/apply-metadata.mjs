import fs from "node:fs";
import sharp from "sharp";
// [aspect, fingerprint, title, place, roll, story, collections, 1=favorite 2=drop duplicate]
const META = [
[0.7503, "fHx6eHV0cXCDg4F+fHp3cnRwd4WBfnx6TUJQaH5/fX9ZVVZjXHVpZ1pbW1tZWFxiLj04NDRESD0rRzccHzY+Mw==", "Office Hours, On Fire", "Long Beach, CA", "yard", "Walked out of class and the sky was already mid-argument with itself. Building looks like it's on fire. It's fine. It's just Tuesday.", ["sunsets", "city"], 0],
[0.7503, "xsbN09LWpazN0tjb3b9berimm31+YHV7dXdNTVdWVkl/c0dTZ0lKY1tNPVFhOy9aPzk/SUM0KjYxMTEyOTAsKg==", "Bridalveil, Snow Cap Edition", "Yosemite National Park", "yosemite", "Bridalveil doing its thing while the peak behind it wore a snow hat. Nature really said 'layers.'", ["mountains", "water"], 0],
[0.7503, "q7O3v8XAvLyoqrXHzMfGwMSyrr3Lwbevur2zopVaVFd1ZUlIQz1KNjIwKywuKCYtJSYjICQwLS0jLSQnMCU1LQ==", "Tunnel View, Obviously", "Yosemite National Park", "yosemite", "The shot everyone takes. I took it too. No regrets, it hits every time.", ["mountains"], 1],
[0.7503, "lZqam5mTmI6zsq+lmY5jRq6tsLW0tVdZtVxMYZSfSlNyND48Pjs7QSc8Rz0pKUBbKS9IQCYpTHAvQDolJRhBPA==", "Rock, Waterfall, Rock", "Yosemite National Park", "yosemite", "Granite wall so big the waterfall looks like a typo. Those tiny trees on top are full-size trees, by the way.", ["mountains", "water"], 0],
[0.7503, "tba5vLq0uMKqvMHGx7+flltdjoueZk1ZbmpcOFpBOj1HTjtMaCwyMEI0NFlqNDAhMjgqMyghIhgpGx0pKQkWEw==", "Front Row at Bridalveil", "Yosemite National Park", "yosemite", "Got close enough to feel the mist. My camera survived. My hoodie did not.", ["mountains", "water"], 0],
[0.7503, "tbOwraupp6a9u7i0sa6sqsLBvrq3tLGvxMK/u7i0sa67ubezsK2qp3Z0bHBoY1thODMpLzAtIS1hXFZYUk5MSQ==", "Golden Hour, Whole Block", "South Bay, Los Angeles", "coast", "Sun went down and lit up every window on the hill like someone hit 'select all.'", ["sunsets", "water", "city"], 0],
[0.7503, "hISEhISDg4KQkJGRkI+OjZ+hoaGgn5aMsrO0tLOypHm1t7e3trWoe4SFhYOCgHRUSUchPkRBNC41MAUDIioWDw==", "Night Shift", "South Bay, Los Angeles", "coast", "Fishermen, one lamp, one tanker, zero bites from what I could tell. Still the best-lit people on the pier.", ["sunsets", "water", "people"], 1],
[1.3333, "wsC6tre6urnDxL++vsHCwcXFwsLExsnJvb/BxMfKzM+sr7O4vsXKzqGio6emdYK6mYVzfopSOnlXVlRPUUxKTA==", "Bell, Moon, Kite", "San Pedro, Los Angeles", "coast", "Korean Bell of Friendship with the moon showing up early and a kite photobombing from the left. Didn't plan it, taking full credit.", ["people"], 1],
[0.7503, "OEBITE9UY3RKT3J4cWttX293eHp6amVWe4eWp7KbiXuBh4uNkoeCek1SWFx9WVdPRUpKS1M6QUIqKBcfKBgWFQ==", "Everyone Stopped", "Southern California coast", "coast", "The one time a crowd goes quiet on purpose. Phones up, sun down.", ["sunsets", "water", "people"], 0],
[0.7503, "KCkrLC4wMzQ1Nzk7PD0/QkVISkxNT1FUXGBkZ2lrbXCIjpKVl5mcn7K3uru8vL7ALCYcKCkYFxMQCgcMBwgKCA==", "Reserved Seating", "Palos Verdes, CA", "coast", "Three chairs, one tripod, zero rush. These folks understood the assignment better than I did.", ["sunsets", "water", "people"], 1],
[1.3333, "gpubk5CRk5dXkKWtoHajsF1rWmpiSFpmj3N4bWc/TE2UaWdVUT1IPVlecVIsZGhlQKZgYVpcdYEhZHeRYT9mhg==", "Research, Mostly", "Pike Place Market, Seattle", "postcards", "A beer flight, a Great Wheel and a view of the Sound. Told everyone I was 'exploring the city.'", ["food", "city"], 0],
[0.7503, "VVVWV1dVUk5laG90TW1qYnZ7hnIScIZ9jZKdhmajmpaViad/QJxfkmp9pFFbi5SnPneifkxrRjkdHyUbDxobFA==", "Palm Tree Skyline", "Long Beach, CA", "yard", "Palm trees standing in line like they're waiting for the sunset to open. A plane signed the sky on its way out.", ["sunsets", "city"], 0],
[0.7503, "YGNjZmZlZGNtbm9vcW9tbX19enl5eXp5hIWAf4GChoZ8gYKEiJGWmH+DgYWZn6GfeGxUbn9vZlQdGBcoNR0WEQ==", "Cotton Candy Ceiling", "Long Beach, CA", "yard", "Looked up from the parking lot and the sky had gone full pink. Best view the lot has ever had.", ["sunsets", "city"], 0],
[0.7399, "KCkqLC0uMDE0Njg6Oz09P0NGSUxOT1BSW19jZmlrbG+EipCUl5mcnq60t7q7vL2/KyoeIysaFxQPDAYKCAYJBw==", "Reserved Seating (Alt Take)", "Palos Verdes, CA", "coast", "Same chairs, same sunset, different crop. Duplicate, drop this one.", ["sunsets"], 2],
[1.3333, "CQ0SGBwcHSQSGB0iKSUhJSMpLi8xMjAlSExKRD44MiVic2RdSz81KjhEMC41MSgoHR8ZFxEMCggNDgoIBgUEBA==", "Lights On, Ocean Off", "Southern California coast", "coast", "Blue hour from the water. The town lit up, Venus clocked in early, and the ocean went quiet.", ["water", "night"], 0],
[0.7503, "hlQuFgwPExOolII5MwkGBbSZjo5JEyMjwLjAxGmMLkZjla23lHotDjJtnZ2UbB4NHBAhVFRCPBETGSYkIBUgFw==", "Street Parking Sunset", "Los Angeles, CA", "yard", "Power lines, parked cars, a street sweeping sign, and still one of the prettiest skies of the year. LA can't help itself.", ["sunsets", "city"], 0],
[0.7503, "hYqPkZKRj4uQl5uen52alpCYn6Olop2XfoSKlZ6ThX5LSUNMZlVOPnF1dXWHdHJuYmZlZ3RnY2BNUFJUW1ZPTg==", "Lake Hours", "Udaipur, India", "postcards", "Sun sinking behind the Aravallis and leaving a gold stripe across the lake. Home has good sunsets too.", ["sunsets", "water"], 1],
[0.7503, "XV9hY2RmZ2hvcnV3eXp8fIOIjI+SlJWWlZmdn6assLO0trq2sri+xLOxs7i9xsjGaW1wc3R3dW4sLTE0NTw8NA==", "Dance Floor: Entire Beach", "Southern California coast", "coast", "Crescent moon above, two people spinning on the sand below. I just happened to be the guy with the camera.", ["sunsets", "water", "people"], 1]
];
const WRITE = process.argv.includes("--write");
const FILE = "src/data/photos.json";
const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
const list = Array.isArray(raw) ? raw : raw.photos;
const fpOf = async (f) => sharp(f).grayscale().resize(8, 8, { fit: "fill" }).raw().toBuffer();
const local = [];
for (const p of list) {
  const rel = (p.sizes && p.sizes["640"]) || p.src;
  const f = "public/" + rel.replace(/^\//, "");
  const { width, height } = await sharp(f).metadata();
  local.push({ p, a: width / height, fp: await fpOf(f) });
}
const pairs = [];
META.forEach((m, i) => {
  const ref = Buffer.from(m[1], "base64");
  for (const l of local) {
    let d = 0; for (let k = 0; k < 64; k++) d += Math.abs(ref[k] - l.fp[k]);
    pairs.push({ i, m, l, d: d / 64 + Math.abs(m[0] - l.a) * 400 });
  }
});
pairs.sort((x, y) => x.d - y.d);
const uM = new Set(), uL = new Set(), hit = [];
for (const x of pairs) if (!uM.has(x.i) && !uL.has(x.l)) { uM.add(x.i); uL.add(x.l); hit.push(x); }
hit.sort((x, y) => x.i - y.i);
const drop = new Set();
for (const { i, m, l, d } of hit) {
  const p = l.p;
  console.log(`${String(i + 1).padStart(2)} ${p.slug.padEnd(38)} ${d.toFixed(1).padStart(5)}  ${m[7] === 2 ? "[DROP duplicate] " : ""}${m[2]}${d > 12 ? "  <-- CHECK" : ""}`);
  if (m[7] === 2) { drop.add(p); continue; }
  Object.assign(p, { title: m[2], place: m[3], roll: m[4], story: m[5], collections: m[6], favorite: m[7] === 1 });
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(p.slug)) {
    const s = m[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    console.log(`   slug ${p.slug} -> ${s}`); p.slug = s;
  }
}
for (const l of local) if (!uL.has(l)) console.log(`?? ${l.p.slug} not matched (unchanged)`);
const kept = list.filter((p) => !drop.has(p));
for (const p of kept) if (!p.date) console.log(`date missing: ${p.slug} — add "date": "YYYY-MM-DD" by hand`);
if (!WRITE) { console.log("\nPreview only. Re-run with --write to save."); process.exit(0); }
fs.writeFileSync(FILE, JSON.stringify(Array.isArray(raw) ? kept : { ...raw, photos: kept }, null, 2) + "\n");
console.log(`Saved ${kept.length} photos (${drop.size} dropped).`);
