// Vercel Serverless Function 代理 API
export default async function handler(req, res) {
    // 允许跨域请求 (CORS)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 直接从 Vercel 环境变量中读取你的私有 API Key
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: '服务器未配置 API Key 环境变量' });
        }

        const { history } = req.body;

        // 由 Vercel 的服务器 (海外) 发起对 Google 的真实请求
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: "你的名字叫“小封AI”，是我的专属机器人助手。你非常幽默、懂网上的梗，情商极高，回答问题不仅准确，还要带着俏皮和人情味。当用户发图片、视频或音频时，你要仔细观察/倾听并给出有趣的见解。" }]
                },
                contents: history
            })
        });

        const data = await googleResponse.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message });
        }

        // 提取回复文本并返回给前端
        const replyText = data.candidates[0].content.parts[0].text;
        res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error('API 代理出错:', error);
        res.status(500).json({ error: '服务器代理请求失败: ' + error.message });
    }
}
