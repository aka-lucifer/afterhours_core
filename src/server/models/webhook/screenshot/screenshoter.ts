import { timeout } from "promise-timeout"

import File from "../discord/file"
import ScreenshotOptions from "./screenshotOptions"

class Screenshoter {
  private readonly _options: ScreenshotOptions;

  constructor(options: ScreenshotOptions = {}) {
    this._options = options;
  }

  takeScreenshot(player: string | number, timeoutMs = 60000) {
    return timeout(
      new Promise<File>((resolve, reject) => {
        global.exports['screenshot-basic'].requestClientScreenshot(player, this._options, (errorMessage: string | false, dateUrl: string) => {
          if (errorMessage) {
            return reject(new Error(errorMessage));
          }

          // console.log(dateUrl.);
          // console.log(dateUrl.);
          // console.log(dateUrl.);
          // console.log(dateUrl.);
          // console.log(dateUrl.);
          // console.log(dateUrl.);

          const extension = dateUrl.substring(dateUrl.indexOf('/') + 1, dateUrl.indexOf(';'));
          const base64Data = dateUrl.substring(dateUrl.indexOf(',') + 1);
          const file = new File(`screenshot.${extension}`, Buffer.from(base64Data, 'base64'));
          resolve(file);
        });
      }),
      timeoutMs
    );
  }
}

export default Screenshoter;
