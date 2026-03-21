// --- 小封AI 核心逻辑 ---
let aiChatHistory = [];
let selectedFile = null;

function openAI() {
    document.getElementById('ai-modal').classList.remove('hidden');
    if (aiChatHistory.length === 0) {
        addMessageToUI('model', '你好呀！我是你的专属高情商助手“小封AI”✨。发文字、发图片、发视频我都在行，有什么想聊的或者需要帮忙的，尽管丢给我！');
    }
}

function closeAI() {
    document.getElementById('ai-modal').classList.add('hidden');
}

function handleAIFile(input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 15 * 1024 * 1024) {
            alert('纯前端直传为了防止浏览器崩溃，建议上传 15MB 以内的文件哦~');
            input.value = '';
            return;
        }
        selectedFile = file;
        document.getElementById('ai-file-preview').classList.remove('hidden');
        document.getElementById('ai-file-name').innerText = file.name;
    }
}

function clearAIFile() {
    selectedFile = null;
    document.getElementById('ai-file-input').value = '';
    document.getElementById('ai-file-preview').classList.add('hidden');
}

function addMessageToUI(role, text, fileUrl = null) {
    const box = document.getElementById('ai-chat-box');
    const isUser = role === 'user';
    
    let mediaHtml = '';
    if (fileUrl) {
        if (fileUrl.startsWith('data:image')) {
            mediaHtml = `<img src="${fileUrl}" class="max-w-[200px] rounded-lg mb-2">`;
        } else if (fileUrl.startsWith('data:video')) {
            mediaHtml = `<video src="${fileUrl}" class="max-w-[200px] rounded-lg mb-2" controls></video>`;
        } else {
            mediaHtml = `<div class="text-xs bg-gray-800 p-2 rounded mb-2">📎 附件已上传</div>`;
        }
    }

    const msgHtml = `
        <div class="flex ${isUser ? 'justify-end' : 'justify-start'} mb-4">
            <div class="max-w-[85%] ${isUser ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-200'} rounded-2xl p-3 shadow-md text-sm leading-relaxed">
                ${mediaHtml}
                <div class="whitespace-pre-wrap">${text}</div>
            </div>
        </div>
    `;
    box.insertAdjacentHTML('beforeend', msgHtml);
    box.scrollTop = box.scrollHeight;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function sendAIMessage() {
    const inputEl = document.getElementById('ai-input');
    const text = inputEl.value.trim();

    if (!text && !selectedFile) return;

    let fileBase64 = null;
    let mimeType = null;
    let fileUrlForUI = null;

    if (selectedFile) {
        fileUrlForUI = await fileToBase64(selectedFile);
        fileBase64 = fileUrlForUI.split(',')[1];
        mimeType = selectedFile.type;
    }

    addMessageToUI('user', text, fileUrlForUI);
    inputEl.value = '';
    
    const parts = [];
    if (text) parts.push({ text: text });
    if (fileBase64) parts.push({ inline_data: { mime_type: mimeType, data: fileBase64 } });

    aiChatHistory.push({ role: "user", parts: parts });
    clearAIFile();

    const box = document.getElementById('ai-chat-box');
    const typingId = 'typing-' + Date.now();
    box.insertAdjacentHTML('beforeend', `
        <div id="${typingId}" class="flex justify-start mb-4">
            <div class="bg-gray-800 text-gray-400 rounded-2xl p-3 text-xs flex gap-1">
                <span class="animate-bounce">●</span><span class="animate-bounce" style="animation-delay: 0.2s">●</span><span class="animate-bounce" style="animation-delay: 0.4s">●</span>
            </div>
        </div>
    `);
    box.scrollTop = box.scrollHeight;

    try {
        // 请求本地部署的 Vercel Serverless API
        const response = await fetch(`/api/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                history: aiChatHistory
            })
        });

        const data = await response.json();
        document.getElementById(typingId)?.remove();

        if (data.error) throw new Error(data.error);

        const replyText = data.reply;
        addMessageToUI('model', replyText);
        aiChatHistory.push({ role: "model", parts: [{ text: replyText }] });

    } catch (err) {
        document.getElementById(typingId)?.remove();
        addMessageToUI('model', '哎呀，网络开小差了或者API配置不对：' + err.message);
        aiChatHistory.pop(); // 移除失败的记录，方便用户重试
    }
}