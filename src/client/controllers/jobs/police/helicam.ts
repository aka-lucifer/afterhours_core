import { Game } from "fivem-js";
import { Delay } from "../../../utils";
import { Client } from "../../../client";

export class HelicamManager {
  private client: Client;
  private streetsTick: number = -1;

  constructor (client: Client) {
    this.client = client;
  }

  private start(): void {
    // First Param (if raycasted position is 0, then use current position, otherwise use raycast position)
    // client1.RenderStreetNames(Vector3.op_Equality(hitPos, (Vector3) Vector3.Zero) ? ((Entity) heli).Position : hitPos);
    if (this.streetsTick == -1) {
      this.streetsTick = setTick(async() => {
        if (Game.PlayerPed.IsInHeli && Game.PlayerPed.CurrentVehicle.HeightAboveGround > 2.5) {
          console.log("in heli above ground!");

          
          // foreach (KeyValuePair<string, List<Vector3>> keyValuePair1 in this._streetOverlay)
          // {
          //   Dictionary<Vector3, double> dictionary = new Dictionary<Vector3, double>();
          //   foreach (Vector3 key in keyValuePair1.Value) {
          //     dictionary.Add(key, (double) World.GetDistance(pos, key));
          //   }
            
          //   List<KeyValuePair<Vector3, double>> list = ((IEnumerable<KeyValuePair<Vector3, double>>) dictionary).ToList<KeyValuePair<Vector3, double>>();
          //   list.Sort((Comparison<KeyValuePair<Vector3, double>>) ((pair1, pair2) => pair1.Value.CompareTo(pair2.Value)));
          //   int num = 0;
          //   foreach (KeyValuePair<Vector3, double> keyValuePair2 in list)
          //   {
          //     if (keyValuePair2.Value < 300.0)
          //     {
          //       this.RenderText3D(keyValuePair2.Key, keyValuePair1.Key);
          //       ++num;
          //     }
          //   }
          //   if (num == 0)
          //   {
          //     KeyValuePair<Vector3, double> keyValuePair2 = ((IEnumerable<KeyValuePair<Vector3, double>>) list).First<KeyValuePair<Vector3, double>>();
          //     if (keyValuePair2.Value < 500.0)
          //     {
          //       keyValuePair2 = ((IEnumerable<KeyValuePair<Vector3, double>>) list).First<KeyValuePair<Vector3, double>>();
          //       this.RenderText3D(keyValuePair2.Key, keyValuePair1.Key);
          //     }
          //   }
          // }
        } else {
          await Delay(1000);
        }

        await Delay(0);
      });
    }
  }
}