import express from "express";
import serverless from "serverless-http";
import ytdl from "ytdl-core";
import cors from "cors";
import { authenticateToken } from './auth_middleware.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const router = express.Router();

// Configuración para ytdl-core
const ytdlOptions = {
    requestOptions: {
        headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'accept-language': 'en-US,en;q=0.9',
            'sec-fetch-dest': 'document',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-site': 'none',
            'sec-fetch-user': '?1',
            'upgrade-insecure-requests': '1'
        }
    }
};

router.use(['/info', '/mp3', '/mp4'], authenticateToken);

router.get("/", (req, res) => {
    res.sendStatus(200);
});

router.get("/info", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getBasicInfo(url, ytdlOptions);

        res.json({ 
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name,
            description: info.videoDetails.description
        });
    } catch (error) {
        console.error('Error in /info:', error);
        res.status(500).json({ error: error.message || "Error getting video info" });
    }
});

router.get("/mp3", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getBasicInfo(url, ytdlOptions);
        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highestaudio',
            filter: 'audioonly'
        });

        if (!format) {
            throw new Error('No suitable audio format found');
        }

        const videoName = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        
        res.header('Content-Disposition', `attachment; filename="${videoName}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        const stream = ytdl(url, {
            ...ytdlOptions,
            format: format
        });

        stream.pipe(res);

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error during streaming' });
            }
        });
    } catch (error) {
        console.error('Error in /mp3:', error);
        res.status(500).json({ error: error.message || "Error downloading audio" });
    }
});

router.get("/mp4", async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ error: "Invalid query - URL is required" });
        }

        const isValid = ytdl.validateURL(url);

        if (!isValid) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }

        const info = await ytdl.getBasicInfo(url, ytdlOptions);
        const format = ytdl.chooseFormat(info.formats, {
            quality: 'highest',
            filter: format => format.container === 'mp4'
        });

        if (!format) {
            throw new Error('No suitable video format found');
        }

        const videoName = info.videoDetails.title.replace(/[^\w\s]/gi, '');

        res.header('Content-Disposition', `attachment; filename="${videoName}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        const stream = ytdl(url, {
            ...ytdlOptions,
            format: format
        });

        stream.pipe(res);

        stream.on('error', (error) => {
            console.error('Stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error during streaming' });
            }
        });
    } catch (error) {
        console.error('Error in /mp4:', error);
        res.status(500).json({ error: error.message || "Error downloading video" });
    }
});

app.use('/.netlify/functions/server', router);
app.use('/api', router);

export const handler = serverless(app);