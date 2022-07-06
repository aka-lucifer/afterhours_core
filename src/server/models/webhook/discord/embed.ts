import { Colour } from "../../../../shared/models/utils/colour";

import EmbedFooter from "./embedFooter";
import EmbedMedia from "./embedMedia";
import EmbedAuthor from "./embedAuthor";
import EmbedField from "./embedField";
import File from "./file";

interface EmbedData {
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    footer?: EmbedFooter;
    image?: EmbedMedia;
    thumbnail?: EmbedMedia;
    video?: EmbedMedia;
    author?: EmbedAuthor;
    fields?: EmbedField[];
}

class Embed {
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    footer?: EmbedFooter;
    image?: EmbedMedia;
    thumbnail?: EmbedMedia;
    video?: EmbedMedia;
    author?: EmbedAuthor;
    fields: EmbedField[];
    files: File[];

    constructor(data?: EmbedData) {
        this.title = data?.title;
        this.description = data?.description;
        this.url = data?.url;
        this.timestamp = data?.timestamp;
        this.color = data?.color;
        this.footer = data?.footer;
        this.image = data?.image;
        this.thumbnail = data?.thumbnail;
        this.video = data?.video;
        this.author = data?.author;
        this.fields = data?.fields ?? [];
        this.files = [];
    }

    setTitle(title: string): string {
        this.title = title;
        return this.title;
    }

    setDescription(description: string): string {
        this.description = description;
        return this.description;
    }

    setUrl(url: string): string {
        this.url = url;
        return this.url;
    }

    setTimestamp(date: Date = new Date()): string {
        this.timestamp = date.toISOString();
        return this.timestamp;
    }

    setColor(color: Colour): number {
        this.color = color.rgbNumber();
        return this.color;
    }

    setFooter(text: string, iconUrl?: string): EmbedFooter {
        this.footer = {
            text,
            icon_url: iconUrl
        };
        return this.footer;
    }

    setImage(image: string | File, width?: number, height?: number): EmbedMedia {
        this.image = {
            url: this.resolveMedia(image),
            width,
            height
        };
        return this.image;
    }

    setThumbnail(thumbnail: string | File, width?: number, height?: number): EmbedMedia {
        this.thumbnail = {
            url: this.resolveMedia(thumbnail),
            width,
            height
        };
        return this.thumbnail;
    }

    setVideo(video: string | File, width?: number, height?: number): EmbedMedia {
        this.video = {
            url: this.resolveMedia(video),
            width,
            height
        };
        return this.video;
    }

    setAuthor(name?: string, url?: string, iconUrl?: string): EmbedAuthor {
        this.author = {
            name,
            url,
            icon_url: iconUrl
        };
        return this.author;
    }

    addField(name: string, value: string): EmbedField[] {
        this.fields.push({
            name,
            value
        });
        return this.fields;
    }

    attachFile(file: File): File[] {
        this.files.push(file);
        return this.files;
    }

    toJSON(): EmbedData {
        return {
            title: this.title,
            description: this.description,
            url: this.url,
            timestamp: this.timestamp,
            color: this.color,
            footer: this.footer,
            image: this.image,
            thumbnail: this.thumbnail,
            video: this.video,
            author: this.author,
            fields: this.fields.length > 0 ? this.fields : undefined
        };
    }

    private resolveMedia(media: string | File) {
        if (media instanceof File) {
            this.attachFile(media);
            return `attachment://${media.name}`;
        }

        return media;
    }
}

export default Embed;

export { EmbedData };
