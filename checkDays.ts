import { getDailyGameSet } from "./src/data/GameLogic";
import { gameTopics as envSciTopics } from "./src/data/GameEnvSci";
import { gameTopics as geoTopics } from "./src/data/GameGeography";
import { gameTopics as natSciTopics } from "./src/data/GameNatSci";
import { gameTopics as otherTopics } from "./src/data/GameOthers";

const rawTopics = [...envSciTopics, ...geoTopics, ...natSciTopics, ...otherTopics];

const epoch = new Date("2026-04-23");
for (let i = 0; i < 11; i++) {
  const date = new Date(epoch);
  date.setUTCDate(epoch.getUTCDate() + i);
  const set = getDailyGameSet(rawTopics, date);
  console.log(`\n// Day ${i} - ${date.toLocaleDateString('en-GB')}:`);
  set.forEach(t => console.log(`  "${t.category}:${t.id}",`));
}
