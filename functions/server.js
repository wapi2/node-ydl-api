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

// Configuración personalizada para ytdl-core
const COOKIE = 'CONSENT=YES+; Path=/; Domain=.youtube.com;';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Aplicar autenticación
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

        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    cookie: COOKIE,
                    'user-agent': USER_AGENT,
                }
            }
        });

        const title = info.videoDetails.title;
        const thumbnail = info.videoDetails.thumbnails[2]?.url;

        res.json({ 
            title, 
            thumbnail,
            duration: info.videoDetails.lengthSeconds,
            author: info.videoDetails.author.name
        });
    } catch (error) {
        console.error('Error in /info:', error);
        res.status(500).json({ error: "Internal server error", details: error.message });
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

        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    cookie: COOKIE,
                    'user-agent': USER_AGENT,
                }
            }
        });
        
        const videoName = info.videoDetails.title;

        res.header("Content-Disposition", `attachment; filename="${videoName}.mp3"`);
        res.header("Content-type", "audio/mpeg3");

        ytdl(url, { 
            quality: "highestaudio", 
            format: "mp3",
            requestOptions: {
                headers: {
                    cookie: COOKIE,
                    'user-agent': USER_AGENT,
                }
            }
        }).pipe(res);
    } catch (error) {
        console.error('Error in /mp3:', error);
        res.status(500).json({ error: "Internal server error", details: error.message });
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

        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    cookie: COOKIE,
                    'user-agent': USER_AGENT,
                }
            }
        });
        
        const videoName = info.videoDetails.title;

        res.header("Content-Disposition", `attachment; filename="${videoName}.mp4"`);

        ytdl(url, {
            quality: "highest",
            format: "mp4",
            requestOptions: {
                headers: {
                    cookie: COOKIE,
                    'user-agent': USER_AGENT,
                }
            }
        }).pipe(res);
    } catch (error) {
        console.error('Error in /mp4:', error);
        res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

app.use('/.netlify/functions/server', router);
app.use('/api', router);

export const handler = serverless(app);