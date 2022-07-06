// import FormData from "form-data";
// import Embed, { EmbedData } from "./embed";
// import File from "./file";
//
// interface WebhookMessageData {
//   content?: string;
//   username?: string;
//   avatar_url?: string;
//   tts?: boolean;
//   embeds?: EmbedData[];
// }
//
// class WebhookMessage {
//   content?: string;
//   username?: string;
//   avatarUrl?: string;
//   tts?: boolean;
//   embeds: Embed[];
//   files: File[];
//
//   constructor(data?: WebhookMessageData) {
//     this.username = data?.username;
//     this.embeds = data?.embeds?.map(embedData => new Embed(embedData)) ?? [];
//   }
//
//   // Methods
//   public toJSON(): WebhookMessageData {
//     return {
//       username: this.username,
//       embeds: this.embeds.length > 0 ? this.embeds.map(embed => embed.toJSON()) : undefined
//     };
//   }
//
//   toFormData() {
//     const formData = new FormData();
//
//     const files = [...this.files];
//     for (const embed of this.embeds) {
//         files.push(...embed.files);
//     }
//
//     for (const file of files) {
//         formData.append('file', file.content, {
//             filename: file.name
//         });
//     }
//
//     formData.append('payload_json', JSON.stringify(this.toJSON()));
//
//     return formData;
// }
// }
//
// export default WebhookMessage;
//
// export { WebhookMessageData };

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
    this.content = data?.content;
    this.username = data?.username;
    this.avatarUrl = data?.avatar_url;
    this.tts = data?.tts;
    this.embeds = data?.embeds?.map(embedData => new Embed(embedData)) ?? [];
    this.files = [];
  }

  setContent(content: string): string {
    this.content = content;
    return this.content;
  }

  setUsername(username: string): string {
    this.username = username;
    return this.username;
  }

  setAvatar(url: string): string {
    this.avatarUrl = url;
    return this.avatarUrl;
  }

  setTts(tts: boolean): boolean {
    this.tts = tts;
    return this.tts;
  }

  addEmbed(embed: Embed): Embed[] {
    this.embeds.push(embed);
    return this.embeds;
  }

  attachFile(file: File): File[] {
    this.files.push(file);
    return this.files;
  }

  toJSON(): WebhookMessageData {
    return {
      content: this.content,
      username: this.username,
      avatar_url: this.avatarUrl,
      tts: this.tts,
      embeds: this.embeds.length > 0 ? this.embeds.map(embed => embed.toJSON()) : undefined
    };
  }

  toFormData(): FormData {
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
