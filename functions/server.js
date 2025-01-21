import express from "express";
import serverless from "serverless-http";
import cors from "cors";
import { authenticateToken } from './auth_middleware.js';
import { YTDlpWrap } from 'yt-dlp-wrap';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const ytDlpPath = join(__dirname, 'yt-dlp');
const ytDlp = new YTDlpWrap(ytDlpPath);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const router = express.Router();

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

        const videoInfo = await ytDlp.getVideoInfo(url);
        
        res.json({ 
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
            uploader: videoInfo.uploader,
            description: videoInfo.description,
            view_count: videoInfo.view_count,
            formats: videoInfo.formats.map(format => ({
                format_id: format.format_id,
                ext: format.ext,
                filesize: format.filesize,
                format_note: format.format_note
            }))
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

        const videoInfo = await ytDlp.getVideoInfo(url);
        const videoName = videoInfo.title.replace(/[^\w\s]/gi, '');
        
        res.header('Content-Disposition', `attachment; filename="${videoName}.mp3"`);
        res.header('Content-Type', 'audio/mpeg');

        const stream = await ytDlp.execStream([
            url,
            '-f', 'bestaudio',
            '--extract-audio',
            '--audio-format', 'mp3',
            '-o', '-'
        ]);

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

        const videoInfo = await ytDlp.getVideoInfo(url);
        const videoName = videoInfo.title.replace(/[^\w\s]/gi, '');

        res.header('Content-Disposition', `attachment; filename="${videoName}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        const stream = await ytDlp.execStream([
            url,
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', '-'
        ]);

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