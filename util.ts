import Ffmpeg from "fluent-ffmpeg"
import fs from "fs"
import { botConf } from './config';

const convert_media = (stream, path, oldfile?): Promise<string> => {
  return new Promise((resolve, reject) => {
    Ffmpeg(stream)
      .on("error", error => {
        if(oldfile) media_clenup(oldfile) 
        console.log(error)
        reject()
      })
      .on("end", (stdout, stderr) => {
        console.log(`Converted size: ${getFileSize(path)} \n`)
        if(oldfile) media_clenup(oldfile) 
        resolve()
      })
      .outputOptions(`-r ${botConf.convert_quality[2]}`)
      .save(path)
    })
}

const media_clenup = (path: string): void => {
  fs.unlinkSync(path)
}

const removeFileExt = (filename): string => {
  return filename.split(".").slice(0, -1).join(".")
}

const logSize = (bytes): string => {
  let output = bytes;
  let steps = 0;

  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB"];

  while (output > 1024) {
      output /= 1024;
      steps++;
  }
  return parseFloat(output).toFixed(2) + " " + units[steps];
}

const getFileSize = (filename: string): string => {
  var stats = fs.statSync(filename)
  return logSize(stats["size"])
}

const progress = (data, size: number): void => {
  let progress = 0, memoryUsage = []

  data.on('data', (data) => {
    progress += Buffer.byteLength(data);
    process.stdout.write("\r" + Math.floor((progress / size * 100)) + "% ");
    memoryUsage.push(process.memoryUsage().heapUsed);
  })

  data.on('end', function() {
    const avg = memoryUsage.reduce((a, i) => a + i) / memoryUsage.length;
    const max = Math.max(...memoryUsage);
    const min = Math.min(...memoryUsage);
    console.log("Memory Usage Statistics for file", logSize(size));
    console.log("Avg:", logSize(avg), "Max:", logSize(max), "Min:", logSize(min));
  });
}


export {
  removeFileExt,
  convert_media,
  media_clenup,
  logSize,
  progress,
  getFileSize,
}
