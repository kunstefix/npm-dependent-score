import fetch from 'cross-fetch';
import {  writeFileSync } from "fs";
import cliSpinners  from 'cli-spinners'
import ora from 'ora';

const pkg = "@angular/core";
const dependents = [];


const sortByPopularity = (a, b ) => b.score?.detail.popularity - a.score?.detail.popularity
const sortByFinalScore = (a, b ) => b.score?.final - a.score?.final
const sortByQuality = (a, b ) => b.score?.detail.quality - a.score?.detail.quality
const sortByMaintenance = (a, b ) => b.score?.detail.maintenance - a.score?.detail.maintenance

const mapByPopularity = r => ({name: r.name, popularity: r.score?.detail.popularity})
const mapByFinalScore = r => ({name: r.name, final: r.score?.final})
const mapByQuality = r => ({name: r.name, quality: r.score?.detail.quality})
const mapByMaintenance = r => ({name: r.name, maintenance: r.score?.detail.maintenance})



const getSorterAndMapper = () => {
  const myArgs = process.argv.slice(2);

  if (myArgs.length > 1) {
    console.log("To many arguments." )
    process.exit(0);
  }


  const allowedArgs = ['popularity', 'maintenance', 'final', 'quality']
  const providedArg = myArgs.length == 0 ? "final" :  myArgs[0]

  if(!allowedArgs.includes(providedArg)) {
  console.log("Invalid argument.")
  console.log("Available options:", allowedArgs.join(', ') )
  process.exit(0);
  }

  const sorters = {
    popularity: sortByPopularity,
    maintenance: sortByMaintenance,
    final: sortByFinalScore,
    quality: sortByQuality,
  }

  const mappers = {
    popularity: mapByPopularity,
    maintenance: mapByMaintenance,
    final: mapByFinalScore,
    quality: mapByQuality,
  }

  return [sorters[providedArg], mappers[providedArg]]
} 


const fetchAll = async (offset = 0) => {
  const res = await fetch(
    `https://www.npmjs.com/browse/depended/${pkg}?offset=${offset}`,
    { headers: { "x-spiferack": "1" }, method: "GET" }
  );
  const data = await res.json();
  dependents.push(...data.packages);
  if (data.hasNext) await fetchAll(offset + data.paginationSize);
};

const main = async () => {
  const [sorter, mapper] = getSorterAndMapper()
  const spinner = ora('Getting results').start();
  spinner.spinner= cliSpinners.bouncingBall

  await fetchAll();
  const result = await Promise.all(
    dependents.map(async ({ name }) => {
      const res = await fetch(
        `https://registry.npmjs.com/-/v1/search?text=${name}&size=1`
      );
      const data = await res.json();
      return { name, score: data.objects[0]?.score };
    })
  );

  let sortedResult = result.sort(sorter)
  let clearedResult = sortedResult.map(mapper)

  const resultString = JSON.stringify(clearedResult, null, 2)
  writeFileSync("./data.json", resultString);

  spinner.stop()
  console.log("Done ✅");
};

main();

