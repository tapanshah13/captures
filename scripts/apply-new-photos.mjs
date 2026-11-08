import fs from "node:fs";
import sharp from "sharp";
// All 43 new photos. [aspect, fingerprint, title, place, roll, story, collections, 1=favorite]
// Matches only photos still titled "TODO". Preview by default; --write to save.
const META = [
[0.7503, "kJibnpyalo2gopibp6mjoKKmoKGswLSgpKyypZ6yn4mXmZ1UbY+IfnB2ikZ2YIZUU3CpbF11hU4IT1QuHiMaFA==", "Overcast, Then Not", "Long Beach, CA", "yard", "Grey all afternoon, then the sun slipped in under the clouds for exactly four minutes. Palm trees didn't even flinch.", ["sunsets", "city"], 0],
[0.7503, "2dfW1NPR0M7b2dfX19XRzcbCvcDGxbSzhYJ5cWpoPTtlV1RUZWdbR19DVklGP0JlXHVGYGBOQ1htWoB8cWdsZw==", "Racing in the Coliseum", "LA Memorial Coliseum", "postcards", "NASCAR. Inside a football stadium. Built a whole track for one night and I still don't fully understand how.", ["sports", "city", "people"], 1],
[0.7503, "w8TDw8LCwsPJysrKycnKysnLzMzNzc3Ou8DBwsPExcctOHt2g5SSqiEfIiMiNyEnXmJ4fIiWoZOFbY6YlqKqgA==", "Red Tower, Pink Sky", "Northern California", "river", "Footbridge, river, and a sky that went full peach while I stood there pretending to stretch.", ["sunsets", "water"], 0],
[0.7503, "wLy6ube2tLLHvqyamamwq5WckYJyaHBqiYJ1bm5uZ2emtKudoaahnxUfHiEiLSQwEDdefIKKh4FDiIaMiIeGgQ==", "Iron Bridge Evening", "Northern California", "river", "Old truss bridge, clouds lit from underneath. The river did the reflection work for free.", ["sunsets", "water"], 1],
[0.7503, "iIF7dXBtameelY2Gf3p1cbatpJyUjIV/ysO8ta6mnZbe1sy7uLahhGlzi5d7b11QCAgLOE5RQCoGBS17cWpfTw==", "Downstream", "Northern California", "river", "Same river, wider view. The last orange stripe before everything went blue.", ["sunsets", "water"], 0],
[0.7503, "GhoaGhoaGhobGxsbGxsaGhwcHBsbGxsbHh8dHRwcHBsoJiEfHh0cHHpTQzAoJyokUTk/MB8cJRs8QEAdGxsbGw==", "Boats After Dark", "Long Beach, CA", "yard", "The marina at night: one boat lit up like it was the main character.", ["water", "night"], 0],
[0.6312, "BgYHBwcJCQgICAkKCg0JBgsMDgwNDQ4NDg8PEBESFBMVFhgaHR8iICUgKzM3OEdDI0tJVHRUVXEbHzZyUyIRDg==", "Red Light, Two Planets", "Los Angeles, CA", "yard", "Stuck at a red light, looked up, found two planets hanging out above the palm trees. Best traffic of my life.", ["city", "night", "sunsets"], 1],
[0.7503, "EhQWFxcWFRMmKSwtLSomIkNKT1JRTEQ6dHuAgoJ8c2ZwdHqRm5aHjlBaanhyc2RmMjNBR0RANDQkJCkqKyYeGQ==", "Venus Clocked In", "Southern California coast", "coast", "Last orange line on the water and two planets showing up early for the night shift.", ["water", "night", "sunsets"], 0],
[0.7503, "AgICAgIEBAQDAwMEBAUGBgQFBwwODgsIBAoMCgkGBQMfJygXIBgXFEpTamZvZEkqCAwOEA4LBwQCAgMEBAMCAg==", "Pier, Lights On", "Southern California coast", "coast", "The pier at night, lamps doing their best against the whole dark Pacific.", ["water", "night"], 0],
[0.8443, "ztPSzcW/vbarsre4w7+5t5SPjpCOk5qdiYyNjo+Rj4yIh4eMkZGMi1pYWFhaW1xYODUvLDA/RkAjGx4ZGyMoJQ==", "Window Seat Win", "Somewhere over the Rockies", "postcards", "Snow peaks, a lid of clouds and golden hour at 35,000 feet. Fought for this seat. Worth it.", ["mountains"], 1],
[0.7503, "Xl5gYWVqcHhmZ2hrb3R7g3SAgIKGipCWUVxqdXyLnKNnYVlWZWFwY3hxem2CTV4xaXNggW9JQ0JlSz8sRCtYOw==", "Very Clear Instructions", "Secret Cove, Lake Tahoe", "tahoe", "The water was this blue. The sign was this direct. I kept my clothes on and my camera pointed at the lake.", ["water", "people"], 0],
[0.7503, "bm5ub3F1cGptgIGChIiDY5ecnJ6go4lnNp+7vLvBlGgpKyoxQVRobS8uOFBaaHuGUj5Gb0NXd3sfJVBOMUtefw==", "Emerald Bay, Through the Pines", "Lake Tahoe, CA", "tahoe", "Framed by pines on purpose, I swear. The blue doesn't need a filter.", ["water", "mountains"], 1],
[0.7503, "hoSCgYGBgYKamJaVlZWVk0VekK60m6RxKiosKj9lbFAjJCMjJFpMUDE6Oi5NWU5jP0I8PF9SXUoqMj81VzNSSQ==", "Fannette Island", "Emerald Bay, Lake Tahoe", "tahoe", "Tahoe's only island, sitting in the middle of the bay like it owns the place. It kind of does.", ["water", "mountains"], 1],
[0.7503, "nZeQjYiDfXxvmaSZkpCMhj5kuqyjnZiSSV3azLarpp55v9nArLOvqi5nfmlha2lLOkFHSTU4OishOFBPTUE8Pg==", "Marine Layer Crosswalk", "Southern California coast", "coast", "Fog rolled in mid-afternoon and turned a normal crosswalk into a movie set.", ["city", "people"], 0],
[0.7503, "oKOjoZ+fnp+zrrayqayzsZqlscPJysnMpaWimJefrbeEhoiDfnx9fHpcdmR4c3N0lU91apignp4eICEhIigoKw==", "Two Walking, One Ball", "Southern California coast", "coast", "Hazy beach, golden stripe, two people heading home with a ball. Didn't plan it, got lucky.", ["sunsets", "water", "people"], 1],
[0.613, "zM3P0NHT1M3JysvNzs/Q0cXFxcfJycrBu7eSbGJ+lXJAUIS8t6F0lG9gbXR4W1NeiJCIiYqVk5CBiplzd6yHdQ==", "The Famous Sign", "Santa Monica Pier", "coast", "Pink car, blue car, road closed, a hundred people and that sign. Very Santa Monica.", ["city", "people"], 0],
[0.7503, "fX6Ag4eMkJaIi42QlJmdopibnqKlqa6ye4WLgYKKj5AcJyo2OjIvLzY2Mjg6ODguLy0rOjM6KSEhKSYgIygyMg==", "Trail With a View", "Mount Rainier, WA", "pnw", "The old camera date stamp says it was 2023. My legs say it was yesterday.", ["mountains", "people"], 0],
[0.7503, "lol/eHJtaWeajoV9d3Jua5iMhX97dnNzoJWJhYOBgIGWn5+LlJaXiyM+NjtDREQ+W1VSWFhrkm8mKCdGWLy8iw==", "Paradise, Literally", "Mount Rainier, WA", "pnw", "The trailhead is literally called Paradise. The mountain wore a cloud hat to match.", ["mountains"], 0],
[0.6584, "npSNh4N+eXWmnZaOiISAfK2hmJCLiIaFt6ykpKKalJVrX1thWExDSx8dKSgjJiYkIDs6LiwqGiNDJCMmOkcwIA==", "Myrtle Falls Moment", "Mount Rainier, WA", "pnw", "Waterfall in front, glacier behind, cloud sitting on top like a lid. Nature showing off on purpose.", ["mountains", "water"], 1],
[0.7503, "uLi4uLm5uLWAfYeHiIaEhG9yd3J0c3hyfIGBf3+FdnZ+cXJ1dXx1b3iMj4B8cn6BY2ZncHlngYBtcHlGT1M9PA==", "Wave Back", "Southern California coast", "coast", "One surfer, one tanker, one very orange sky. Pretty sure he was waving at the ship.", ["sunsets", "water", "people"], 1],
[0.7503, "kI6MjIyNjY6TlpqZm56Zj2hge311a1pbZVxVVVFXWVp/dHBtX1laXbGzqqt1TkZPsLKgpa2rn6N0f25xa3SFnQ==", "Diablo Lake Is Not Edited", "North Cascades, WA", "pnw", "Glacier flour makes the water this color. I didn't touch a single slider. A boat drew a line for scale.", ["water", "mountains"], 1],
[0.7503, "vcLBy8/L0M+nrKSurq+krVpQT2RdZ3B3gX5iUF1pYl5sTKA+WmlwZ00okk9DX1pOWGuoomxfZW+Eb1pUVX9ocQ==", "Snoqualmie Falls", "Snoqualmie, WA", "pnw", "Loud, misty, and taller than it looks. Also the waterfall from Twin Peaks, if that means anything to you.", ["water"], 0],
[0.7503, "hI6jqZqUjISSlZiXmJaRjJ+ho6OjoqGfb2RlUldNSzZsb3Nve3l1ZUhLY2hcYGlhRURVSURDQDs3YlE6Oz4+KA==", "Paddle Break", "Lake Washington, WA", "pnw", "Stopped paddling for exactly one photo. The sun handled the sparkles.", ["water"], 0],
[0.7503, "TgkDAgICAwkyAgICAgIECRMBAQICAgECEwEBAQECAgQQAwQCCwU2AwweDRETP1ZRFyY3MzknGRg5PjIyWU5HOQ==", "Hollywood, Closing Time", "Hollywood, Los Angeles", "yard", "Hollywood Boulevard after midnight: empty street, red lights and a dinosaur keeping watch.", ["city", "night"], 0],
[0.7503, "gIOFhIJ+eXSXnJ6em5aQiKWvtbSvqKKaj5WUi4eBfnZ6gYqNjId1X2Jugn55cWxUV1VYWGVYR085S2FPJjlJVw==", "Malibu Glow", "Santa Monica, CA", "coast", "Sun gone behind the Malibu hills, waves still catching the leftovers.", ["sunsets", "water"], 0],
[1.3333, "S1FVWFlXU09XXGBkZ2djYGhscHV4eXl3h42PkpWWlpa0uru9vr68sVxka25cSjITOjw6MA8ODQ0LDA0PDAoKCw==", "Palos Verdes Blue Hour", "Palos Verdes, CA", "coast", "Five palms, one orange line, the whole bay turning blue. Sat on the grass until it was gone.", ["sunsets", "water"], 1],
[0.7503, "ERERERERExMSEhITEhITExIRERERERERExQVFBMSEhMYFxcYFxYVFhoZMTgcGhUWJhkXHis4OUYkMCUVFiMxKg==", "Mickey Never Sleeps", "Disney California Adventure", "disney", "Pixar Pier at night. He's smiling because he knows what the churros cost.", ["night", "people"], 0],
[0.7503, "DQ0OEBAQDw4NDg8REhEREA4QERIUFBIQEhQVFRUVFBITFBUWFRQTERUWGhwYFRUULyMhKzEzLjI0IiQaKCgnJQ==", "Wheel Over Water", "Disney California Adventure", "disney", "Same wheel, wider view, with the coaster and the lake doing the reflections.", ["night", "water"], 0],
[0.7503, "AQIePD5BQkUBAhlNUFNVVwECEGZscHJzAwVZjJOXmJYCCp65wborLgURi5BNEgMECQ8VEg0IBAQKDA8QDQsJBg==", "Street Goes Quiet", "Long Beach, CA", "yard", "Trees going black, sky going orange, parked cars minding their business.", ["sunsets", "city"], 0],
[0.7503, "RUpIa8CrSkhRRkhjx6tIS0g6QVqbYz88SDo6P5FqMy5AMDc1dTIwNTYgJidKHxkiKR0bN0YpHh4pJiYxPkA0LA==", "Rush Hour, Theatre Lights", "Chicago, IL", "chicago", "Brake lights all the way down the street and one theatre sign glowing like it's opening night.", ["city", "people"], 0],
[0.7503, "ztvJo4RsUzzB4dO9jVNbUqa0tKh/S2RglZOSjnx1emt9d4NSdnBXXnlsclBxfEVXR1JST1tIMScoOT01KikmHw==", "Palm Tree Lineup", "Long Beach, CA", "yard", "Sunny day, very tall trees, my neck still hurts.", ["city"], 0],
[0.7503, "ISEjODAfDgoYGCAsJhEQEh0PKUhNGigwPis6NU8sKCMxQBoQGhkdFhMGCyUmFQ8KHykdMSQRDw5JPislHRQIFg==", "Neon at the Market", "Pike Place Market, Seattle", "pnw", "Red neon, closing time, and a guy buying flowers. Felt like a movie I wasn't in.", ["city", "people"], 0],
[0.7503, "dXV2d3l8goqAhIaJjJGXoYiRmJ6kq7TAcnt7fnx4eXgzNjQvOTc2MDEsJS8zOi8wNDQxKR0eGCQxODYsGiMoIQ==", "The View From Up There", "360 Chicago, IL", "chicago", "Golden hour from the 94th floor. The city looks calm from up here. It is not.", ["city", "sunsets"], 1],
[0.7503, "sbm3wbespKKgprGztKuVin9+k6atnYN3S0hRhtaqem48RFyFtnRJMktIV5CNcTw2Pis5cJeDXz9fR0BXemZaPw==", "Indoor Waterfall, Why Not", "Jewel Changi, Singapore", "postcards", "An airport with a rain vortex in the middle of a jungle. I'd miss my flight for this.", ["water", "people"], 1],
[1.3333, "Q0JBQEA9OzpOUVRUVFJQT2ltcHNzb21mkJmeoaCcl4xbY2dqaGlpXx0aHRgdIhYNDh8dFxkWEw0TChUPERgXFg==", "Floor 103", "Willis Tower, Chicago", "chicago", "The sun went down and the whole grid lit up. Reflections included, free of charge.", ["city", "sunsets", "night"], 1],
[0.9668, "J59xRz1nhFxJXoRiiImChZB1UE11qayKkIhjfC6gu3bNwnmZZU9uhMLKr0Rzc32hqcOihISGlqOLkpabnqOepA==", "One of Everything", "Starbucks Reserve, Chicago", "chicago", "Ordered one of everything. Research purposes only.", ["food"], 0],
[0.6571, "v52TjGxpgMm9lZiFdnZzdEt6lbWrpolFHRt6R0s7KRoSWJ5hNFY3J0FQoJMtKWJ5S0hQgW1LQGNEWjCDoGxgYQ==", "Hidden Falls", "India", "postcards", "Monsoon-season waterfall, loud enough that nobody could hear me say 'wow' for the fifth time.", ["water", "mountains"], 1],
[0.7503, "mJmZmpubm5yhoaKio6OkpKqqq6usrKyttre4uLm4uLird0RUbEuPukM8PERAPUVoNzw7QjpIPkUvLzo8KjMtQw==", "Cathedral Rock", "Sedona, AZ", "sedona", "Red rock, blue sky, zero clouds. Sedona doesn't do subtle.", ["mountains"], 1],
[0.7056, "kJOVlZWVlJSSlZeXl5eXl5udn5+fnZ2dqKmoq6upqamxpKGup7m5undoY4isrq6fZVBRY2NcWDcnKSpIPyshNw==", "The Public Market Sign", "Pike Place Market, Seattle", "pnw", "The sign, the Sound, and a crane that photobombed every single angle.", ["city", "water"], 0],
[0.7503, "p6uxu8PAxsmmqrK1ucPLyqanp620v8vTlpKTkpegpqpva2twd4COrklHRlNiSnCFJCklLSEYIikcIighIyotLw==", "Grey Day, Big Ocean", "Northern California coast", "postcards", "Fog, wind, an old fence and the whole Pacific. Moody on purpose (it was not on purpose).", ["water"], 0],
[0.7503, "bmNnXlxcV1JtXVpUUFBSWaZtX2dkgmZyg5WqqqyytI9VplplbmKbs2GEMjl2paNdV1yIgJuqTVM4XmRtXEFJaw==", "Ramen Break", "Rakkan Ramen", "yard", "Mushrooms, corn, tofu, no regrets. Fuel for more sunset chasing.", ["food"], 0],
[1.3333, "io6RlJWSjYqPlZqeoJyUj4ySmaGkm5KNfYGJnqGLc1gsMDxUTS8gGhcWFxwaGRYUEBIVFhUWFBMPEBESERAQDg==", "Sedona Says Goodnight", "Sedona, AZ", "sedona", "The sun split into two on its way down behind the red rocks. Physics, but make it pretty.", ["sunsets", "mountains"], 1],
[1.3333, "cnd6e3t6dW95fX5+fn57dHZ6e319enhyZnF5hoJ2cGcvQVl0ZEAfEAgIBwkIBwYGBQUFBAUEBAQEAwMDAwMDAw==", "Last Light, Red Rocks", "Sedona, AZ", "sedona", "Two minutes later: just the glow and the silhouettes. Everyone stayed quiet.", ["sunsets", "mountains"], 0]
];
const WRITE = process.argv.includes("--write");
const FILE = "src/data/photos.json";
const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
const list = Array.isArray(raw) ? raw : raw.photos;
const fpOf = (f) => sharp(f).grayscale().resize(8, 8, { fit: "fill" }).raw().toBuffer();
const local = [];
for (const p of list) {
  if (p.title !== "TODO") continue;
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
let bad = 0;
for (const { i, m, l, d } of hit) {
  const p = l.p, flag = d > 12;
  if (flag) bad++;
  console.log(`${String(i + 1).padStart(2)} ${p.slug.padEnd(40)} ${d.toFixed(1).padStart(5)}  ${m[4].padEnd(10)} ${m[2]}${flag ? "  <-- CHECK" : ""}`);
  Object.assign(p, { title: m[2], place: m[3], roll: m[4], story: m[5], collections: m[6], favorite: m[7] === 1 });
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(p.slug)) {
    const s = m[2].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    console.log(`   slug ${p.slug} -> ${s}`); p.slug = s;
  }
}
const left = list.filter((p) => p.title === "TODO").length;
console.log(`\n${hit.length} matched, ${bad} to CHECK, ${left} photos still TODO.`);
if (!WRITE) { console.log("Preview only. Re-run with --write to save."); process.exit(0); }
fs.writeFileSync(FILE, JSON.stringify(raw, null, 2) + "\n");
console.log("Saved.");
