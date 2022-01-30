import FormData from "form-data";
import Embed, { EmbedData } from "./embed";
import File from "./file";

interface WebhookMessageData {
  content?: string;
  username?: string;
  avatar_url?: string;
  tts?: boolean;
  embeds?: EmbedData[];
}

class WebhookMessage {
  content?: string;
  username?: string;
  avatarUrl?: string;
  tts?: boolean;
  embeds: Embed[];
  files: File[];

  constructor(data?: WebhookMessageData) {
    this.username = data?.username;
    this.embeds = data?.embeds?.map(embedData => new Embed(embedData)) ?? [];
  }

  // Methods
  public toJSON(): WebhookMessageData {
    return {
      username: this.username,
      embeds: this.embeds.length > 0 ? this.embeds.map(embed => embed.toJSON()) : undefined
    };
  }

  toFormData() {
    const formData = new FormData();

    const files = [...this.files];
    for (const embed of this.embeds) {
        files.push(...embed.files);
    }

    for (const file of files) {
        formData.append('file', file.content, {
            filename: file.name
        });
    }

    formData.append('payload_json', JSON.stringify(this.toJSON()));

    return formData;
}
}

export default WebhookMessage;

export { WebhookMessageData };