// 配置信息
const CONFIG = {
    official: {
        url: 'https://api.example.com/v1/endpoint',
        headers: {
            'Content-Type': 'application/json'
        },
        params: {
            key: ''
        }
    },
    thirdParty: {
        url: 'https://api.example.com/v1/endpoint',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': ''
        }
    }
};

// 历史记录存储
let conversationHistory = {
    official: [],
    thirdParty: []
};

// 存储API详情数据（持久化到localStorage）
let apiDetailsStorage = {};

// ===== AI模型模板和配置 =====
const AI_MODELS = {
    'gemini': {
        name: 'Gemini',
        description: 'Google Gemini API',
        defaultUrl: 'https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-pro:generateContent',
        defaultAuthType: 'api-key',
        requestTemplate: {
            contents: [
                {
                    role: "user",
                    parts: [{ text: "{{message}}" }]
                }
            ]
        },
        responseParser: {
            successPath: 'candidates[0].content.parts[0].text',
            errorPath: 'error.message'
        }
    },
    'openai': {
        name: 'OpenAI GPT',
        description: 'OpenAI GPT API',
        defaultUrl: 'https://api.openai.com/v1/chat/completions',
        defaultAuthType: 'bearer',
        requestTemplate: {
            messages: [
                {
                    role: "user",
                    content: "{{message}}"
                }
            ],
            model: "gpt-4"
        },
        responseParser: {
            successPath: 'choices[0].message.content',
            errorPath: 'error.message'
        }
    },
    'claude': {
        name: 'Claude',
        description: 'Anthropic Claude API',
        defaultUrl: 'https://api.anthropic.com/v1/messages',
        defaultAuthType: 'bearer',
        requestTemplate: {
            messages: [
                {
                    role: "user",
                    content: "{{message}}"
                }
            ],
            model: "claude-3-sonnet-20240229"
        },
        responseParser: {
            successPath: 'content[0].text',
            errorPath: 'error.message'
        }
    }
};

// ===== API 配置弹窗逻辑 =====
const DEFAULT_CONFIGS = {
    'official': {
        name: '左侧API配置',
        url: 'https://api.example.com/v1/endpoint',
        aiModel: 'gemini',
        httpMethod: 'POST',
        contentType: 'application/json',
        headers: {},
        params: {}
    },
    'third-party': {
        name: '右侧API配置',
        url: 'https://api.example.com/v1/endpoint',
        aiModel: 'gemini',
        httpMethod: 'POST',
        contentType: 'application/json',
        headers: {},
        params: {}
    }
};

let apiConfigs = {};

function loadApiConfigs() {
    const saved = localStorage.getItem('api-configs');
    if (saved) {
        apiConfigs = JSON.parse(saved);
    } else {
        apiConfigs = JSON.parse(JSON.stringify(DEFAULT_CONFIGS));
    }
}

function saveApiConfigs() {
    localStorage.setItem('api-configs', JSON.stringify(apiConfigs));
}

function updateModelConfig(type) {
    const modelSelect = document.getElementById(`${type}-ai-model`);
    const modelType = modelSelect.value;
    const model = AI_MODELS[modelType];
    
    if (model) {
        // 自动填充默认URL
        document.getElementById(`${type}-api-url`).value = model.defaultUrl;
    }
}

function showApiConfig(type) {
    loadApiConfigs();
    const config = apiConfigs[type] || DEFAULT_CONFIGS[type];
    
    // 填充表单
    document.getElementById(`${type}-ai-model`).value = config.aiModel || 'gemini';
    document.getElementById(`${type}-http-method`).value = config.httpMethod || 'POST';
    document.getElementById(`${type}-api-name`).value = config.name || '';
    document.getElementById(`${type}-api-url`).value = config.url || '';
    document.getElementById(`${type}-content-type`).value = config.contentType || 'application/json';
    
    // 填充headers
    const headersList = document.getElementById(`${type}-headers-list`);
    headersList.innerHTML = '';
    Object.entries(config.headers || {}).forEach(([key, value]) => {
        const row = createHeaderRow(type, key, value);
        headersList.appendChild(row);
    });
    
    // 填充params
    const paramsList = document.getElementById(`${type}-params-list`);
    paramsList.innerHTML = '';
    Object.entries(config.params || {}).forEach(([key, value]) => {
        const row = createParamRow(type, key, value);
        paramsList.appendChild(row);
    });
    
    // 显示弹窗
    document.getElementById(`${type}-config-modal`).style.display = 'flex';
}

function closeApiConfig(type) {
    document.getElementById(`${type}-config-modal`).style.display = 'none';
}

function createHeaderRow(type, key = '', value = '') {
    const div = document.createElement('div');
    div.className = 'header-item';
    div.innerHTML = `
        <input type="text" class="header-key" placeholder="Header名称" value="${key}">
        <input type="text" class="header-value" placeholder="Header值" value="${value}">
        <button type="button" class="remove-btn" title="删除" onclick="this.parentNode.remove()">×</button>
    `;
    return div;
}

function createParamRow(type, key = '', value = '') {
    const div = document.createElement('div');
    div.className = 'param-item';
    div.innerHTML = `
        <input type="text" class="param-key" placeholder="参数名" value="${key}">
        <input type="text" class="param-value" placeholder="参数值" value="${value}">
        <button type="button" class="remove-btn" title="删除" onclick="this.parentNode.remove()">×</button>
    `;
    return div;
}

function addHeaderRow(type) {
    const headersList = document.getElementById(`${type}-headers-list`);
    headersList.appendChild(createHeaderRow(type));
}

function addParamRow(type) {
    const paramsList = document.getElementById(`${type}-params-list`);
    paramsList.appendChild(createParamRow(type));
}

function saveApiConfig(type) {
    console.log('开始保存配置:', type);
    
    // 收集表单数据
    const aiModel = document.getElementById(`${type}-ai-model`).value;
    const httpMethod = document.getElementById(`${type}-http-method`).value;
    const name = document.getElementById(`${type}-api-name`).value.trim();
    const url = document.getElementById(`${type}-api-url`).value.trim();
    const contentType = document.getElementById(`${type}-content-type`).value;
    
    console.log('收集的表单数据:', { aiModel, httpMethod, name, url, contentType });
    
    // 验证API名称是否为空
    if (!name) {
        alert('API名称不能为空，请输入API名称');
        document.getElementById(`${type}-api-name`).focus();
        return;
    }
    
    // headers
    const headers = {};
    document.querySelectorAll(`#${type}-headers-list .header-item`).forEach(row => {
        const key = row.querySelector('.header-key').value.trim();
        const value = row.querySelector('.header-value').value.trim();
        if (key) headers[key] = value;
    });
    
    // params
    const params = {};
    document.querySelectorAll(`#${type}-params-list .param-item`).forEach(row => {
        const key = row.querySelector('.param-key').value.trim();
        const value = row.querySelector('.param-value').value.trim();
        if (key) params[key] = value;
    });
    
    const config = { 
        aiModel, httpMethod, name, url, headers, params, contentType 
    };
    
    console.log('保存的配置:', config);
    
    apiConfigs[type] = config;
    saveApiConfigs();
    
    console.log('保存后的apiConfigs:', apiConfigs);
    
    closeApiConfig(type);
    showNotification('配置已保存');
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadApiDetails(); // 先加载API详情
    loadHistory();    // 再加载历史记录
    loadApiConfigs(); // 加载API配置
    setupEventListeners();
    
    // 如果没有配置，设置默认配置
    if (!apiConfigs.official || !apiConfigs['third-party']) {
        apiConfigs = JSON.parse(JSON.stringify(DEFAULT_CONFIGS));
        saveApiConfigs();
    }
});

// 设置事件监听器
function setupEventListeners() {
    // 为输入框添加回车键发送功能
    document.getElementById('official-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage('official');
        }
    });
    
    document.getElementById('third-party-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage('third-party');
        }
    });
}

// 发送消息
async function sendMessage(type) {
    const inputElement = document.getElementById(type === 'official' ? 'official-input' : 'third-party-input');
    const message = inputElement.value.trim();
    
    if (!message) {
        alert('请输入消息内容');
        return;
    }
    
    // 禁用发送按钮
    const sendBtn = inputElement.nextElementSibling;
    const originalText = sendBtn.textContent;
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';
    
    try {
        // 添加用户消息到历史记录
        addMessageToHistory(type, 'user', message);
        
        // 清空输入框
        inputElement.value = '';
        
        // 显示加载状态
        showLoading(type);
        
        // 调用API
        const response = await callAPI(type, message);
        
        // 隐藏加载状态
        hideLoading(type);
        
        // 添加AI回复到历史记录
        addMessageToHistory(type, 'assistant', response.text, response.apiInfo);
        
        // 保存历史记录（API详情已经在addMessageToHistory中保存了）
        saveHistory();
        
    } catch (error) {
        console.error('API调用错误:', error);
        hideLoading(type);
        addErrorMessage(type, error.message);
    } finally {
        // 恢复发送按钮
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
    }
}

// 调用API
async function callAPI(type, message) {
    console.log('开始调用API:', type);
    console.log('当前配置:', apiConfigs);
    
    // 使用新的配置系统
    const config = apiConfigs[type];
    if (!config) {
        console.error('配置不存在:', type);
        throw new Error('API配置不存在，请先配置API');
    }
    
    console.log('使用的配置:', config);
    
    // 构建请求体
    const aiModel = AI_MODELS[config.aiModel];
    if (!aiModel) {
        throw new Error('不支持的AI模型');
    }
    
    // 使用模型模板构建请求体
    const requestBody = JSON.parse(
        JSON.stringify(aiModel.requestTemplate)
            .replace(/{{message}}/g, message)
    );
    
    // 构建URL
    let url = config.url;
    
    // 添加URL参数
    const urlParams = new URLSearchParams();
    
    // 添加配置的URL参数
    Object.entries(config.params || {}).forEach(([key, value]) => {
        urlParams.append(key, value);
        console.log('添加URL参数:', key, value);
    });
    
    if (urlParams.toString()) {
        url += `?${urlParams.toString()}`;
    }
    
    console.log('最终URL:', url);
    
    // 构建请求头
    const headers = {};
    
    // 自动添加Content-Type
    headers['Content-Type'] = config.contentType;
    
    // 添加配置的请求头
    Object.entries(config.headers || {}).forEach(([key, value]) => {
        headers[key] = value;
        console.log('添加请求头:', key, value);
    });
    
    // 构建请求选项
    const requestOptions = {
        method: config.httpMethod,
        headers: headers
    };
    
    // 添加请求体（非GET请求）
    if (config.httpMethod !== 'GET') {
        requestOptions.body = JSON.stringify(requestBody);
    }
    
    console.log('发送请求:', {
        url: url,
        method: config.httpMethod,
        headers: headers,
        body: requestBody
    });
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    
    // 使用模型模板解析响应
    try {
        const text = getNestedValue(data, aiModel.responseParser.successPath);
        if (!text) {
            throw new Error('无法从响应中提取文本内容');
        }
        
        return {
            text: text,
            apiInfo: {
                request: {
                    url: url,
                    method: config.httpMethod,
                    headers: headers,
                    body: requestBody
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    body: data
                }
            }
        };
    } catch (error) {
        throw new Error(`响应解析失败: ${error.message}`);
    }
}

// 辅助函数：从嵌套对象中获取值
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        if (key.includes('[')) {
            const arrayKey = key.split('[')[0];
            const index = parseInt(key.match(/\[(\d+)\]/)[1]);
            return current[arrayKey][index];
        }
        return current[key];
    }, obj);
}

// 添加消息到历史记录
function addMessageToHistory(type, role, content, apiInfo = null) {
    const messageId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const message = {
        role: role,
        content: content,
        timestamp: new Date().toLocaleString('zh-CN'),
        messageId: messageId
    };
    
    // 如果有API信息，保存到持久化存储
    if (apiInfo) {
        apiDetailsStorage[messageId] = apiInfo;
        saveApiDetails();
    }
    
    conversationHistory[type === 'official' ? 'official' : 'thirdParty'].push(message);
    displayMessage(type, message);
}

// 显示消息
function displayMessage(type, message) {
    const historyContainer = document.getElementById(type === 'official' ? 'official-history' : 'third-party-history');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}-message`;
    
    let contentHtml = `
        <div class="message-time">${message.timestamp}</div>
        <div class="message-content">${escapeHtml(message.content)}</div>
    `;
    
    // 如果是AI回复且有messageId，检查是否有API详情
    if (message.role === 'assistant' && message.messageId) {
        const hasApiDetails = apiDetailsStorage[message.messageId];
        
        if (hasApiDetails) {
            contentHtml += `
                <div class="message-actions">
                    <button class="copy-answer-btn" onclick="copyAnswer('${message.messageId}')" title="复制回答内容">
                        📋 复制回答
                    </button>
                    <button class="raw-data-btn" onclick="showApiInfo('${message.messageId}')" title="查看API请求详情">
                        📄 API详情
                    </button>
                </div>
            `;
        }
    }
    
    messageDiv.innerHTML = contentHtml;
    historyContainer.appendChild(messageDiv);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

// 显示加载状态
function showLoading(type) {
    const historyContainer = document.getElementById(type === 'official' ? 'official-history' : 'third-party-history');
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant-message';
    loadingDiv.id = `${type}-loading`;
    
    loadingDiv.innerHTML = `
        <div class="loading-container">
            <div class="loading"></div>
            <span class="loading-text">正在生成回复...</span>
        </div>
    `;
    
    historyContainer.appendChild(loadingDiv);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

// 隐藏加载状态
function hideLoading(type) {
    const loadingDiv = document.getElementById(`${type}-loading`);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// 显示错误消息
function addErrorMessage(type, errorMessage) {
    const historyContainer = document.getElementById(type === 'official' ? 'official-history' : 'third-party-history');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message assistant-message error-message';
    
    errorDiv.innerHTML = `
        <div class="message-time">${new Date().toLocaleString('zh-CN')}</div>
        <div class="message-content">❌ 错误: ${escapeHtml(errorMessage)}</div>
    `;
    
    historyContainer.appendChild(errorDiv);
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 保存历史记录到本地存储
function saveHistory() {
    localStorage.setItem('gemini-conversation-history', JSON.stringify(conversationHistory));
}

// 从本地存储加载历史记录
function loadHistory() {
    const saved = localStorage.getItem('gemini-conversation-history');
    if (saved) {
        conversationHistory = JSON.parse(saved);
        // 为旧数据添加messageId（如果没有的话）
        conversationHistory.official.forEach((message, index) => {
            if (!message.messageId && message.role === 'assistant') {
                message.messageId = `official-legacy-${index}`;
            }
        });
        conversationHistory.thirdParty.forEach((message, index) => {
            if (!message.messageId && message.role === 'assistant') {
                message.messageId = `third-party-legacy-${index}`;
            }
        });
        displayAllHistory();
    }
}

// 保存API详情到localStorage
function saveApiDetails() {
    localStorage.setItem('api-details', JSON.stringify(apiDetailsStorage));
}

// 从localStorage加载API详情
function loadApiDetails() {
    const saved = localStorage.getItem('api-details');
    if (saved) {
        apiDetailsStorage = JSON.parse(saved);
    }
}

// 显示所有历史记录
function displayAllHistory() {
    // 显示官方API历史记录
    const officialContainer = document.getElementById('official-history');
    officialContainer.innerHTML = '';
    conversationHistory.official.forEach(message => {
        displayMessage('official', message);
    });
    
    // 显示第三方API历史记录
    const thirdPartyContainer = document.getElementById('third-party-history');
    thirdPartyContainer.innerHTML = '';
    conversationHistory.thirdParty.forEach(message => {
        displayMessage('third-party', message);
    });
}

// 导出历史记录
function exportHistory(type) {
    const history = conversationHistory[type === 'official' ? 'official' : 'thirdParty'];
    
    if (history.length === 0) {
        alert('没有历史记录可导出');
        return;
    }
    
    // 从配置中获取API名称，如果没有配置则使用默认名称
    let moduleName;
    const config = apiConfigs[type];
    if (config && config.name && config.name.trim()) {
        moduleName = config.name.trim();
    } else {
        // 如果没有配置或名称为空，使用默认名称
        moduleName = type === 'official' ? '左侧API配置' : '右侧API配置';
    }
    
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    // 生成导出内容
    let exportContent = `# ${moduleName} 对话历史记录\n`;
    exportContent += `导出时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
    
    history.forEach((message, index) => {
        const role = message.role === 'user' ? '用户' : 'AI助手';
        exportContent += `## 第${index + 1}轮对话\n`;
        exportContent += `**时间**: ${message.timestamp}\n`;
        exportContent += `**${role}**: ${message.content}\n\n`;
    });
    
    // 创建并下载文件
    const blob = new Blob([exportContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${moduleName}_对话历史_${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 显示API信息
function showApiInfo(messageId) {
    const apiInfo = apiDetailsStorage[messageId];
    if (!apiInfo) {
        alert('API信息不存在');
        return;
    }
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'raw-data-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>API 请求详情</h3>
                <div class="tab-buttons">
                    <button class="tab-btn active" onclick="switchTab('request', '${messageId}')">请求信息</button>
                    <button class="tab-btn" onclick="switchTab('response', '${messageId}')">响应数据</button>
                </div>
                <button class="close-btn" onclick="closeApiInfoModal()">×</button>
            </div>
            <div class="modal-body">
                <div id="request-tab-${messageId}" class="tab-content active">
                    ${generateRequestTab(apiInfo.request)}
                </div>
                <div id="response-tab-${messageId}" class="tab-content">
                    ${generateResponseTab(apiInfo.response)}
                </div>
            </div>
            <div class="modal-footer">
                <button class="copy-btn" onclick="copyApiInfo('${messageId}')">复制数据</button>
                <button class="close-btn" onclick="closeApiInfoModal()">关闭</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 添加点击背景关闭功能
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeApiInfoModal();
        }
    });
}

// 生成请求信息标签页内容
function generateRequestTab(request) {
    const formattedHeaders = JSON.stringify(request.headers, null, 2);
    const formattedBody = JSON.stringify(request.body, null, 2);
    
    return `
        <div class="api-info-section">
            <h4>请求URL</h4>
            <div class="code-block">${escapeHtml(request.url)}</div>
            
            <h4>请求方法</h4>
            <div class="code-block">${escapeHtml(request.method)}</div>
            
            <h4>请求头</h4>
            <pre class="json-content">${escapeHtml(formattedHeaders)}</pre>
            
            <h4>请求体</h4>
            <pre class="json-content">${escapeHtml(formattedBody)}</pre>
        </div>
    `;
}

// 生成响应信息标签页内容
function generateResponseTab(response) {
    const formattedHeaders = JSON.stringify(response.headers, null, 2);
    const formattedBody = JSON.stringify(response.body, null, 2);
    
    return `
        <div class="api-info-section">
            <h4>响应状态</h4>
            <div class="code-block">${escapeHtml(response.status)} ${escapeHtml(response.statusText)}</div>
            
            <h4>响应头</h4>
            <pre class="json-content">${escapeHtml(formattedHeaders)}</pre>
            
            <h4>响应体</h4>
            <pre class="json-content">${escapeHtml(formattedBody)}</pre>
        </div>
    `;
}

// 切换标签页
function switchTab(tabName, messageId) {
    // 隐藏所有标签页内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 移除所有标签页按钮的active状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示选中的标签页
    document.getElementById(`${tabName}-tab-${messageId}`).classList.add('active');
    
    // 激活对应的按钮
    event.target.classList.add('active');
}

// 关闭API信息模态框
function closeApiInfoModal() {
    const modal = document.querySelector('.raw-data-modal');
    if (modal) {
        modal.remove();
    }
}

// 复制回答内容
function copyAnswer(messageId) {
    // 从apiDetailsStorage中获取对应的消息内容
    const apiInfo = apiDetailsStorage[messageId];
    if (!apiInfo) {
        alert('回答内容不存在');
        return;
    }
    
    // 从API信息中提取回答内容
    const answerText = apiInfo.response.body.candidates[0].content.parts[0].text;
    
    navigator.clipboard.writeText(answerText).then(function() {
        showNotification('回答内容已复制到剪贴板');
    }).catch(function(err) {
        console.error('复制失败:', err);
        // 降级方案：创建临时文本区域
        const textArea = document.createElement('textarea');
        textArea.value = answerText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('回答内容已复制到剪贴板');
    });
}

// 复制API信息
function copyApiInfo(messageId) {
    const apiInfo = apiDetailsStorage[messageId];
    if (!apiInfo) {
        alert('API信息不存在');
        return;
    }
    
    const formattedInfo = JSON.stringify(apiInfo, null, 2);
    
    navigator.clipboard.writeText(formattedInfo).then(function() {
        alert('API信息已复制到剪贴板');
    }).catch(function(err) {
        console.error('复制失败:', err);
        // 降级方案：创建临时文本区域
        const textArea = document.createElement('textarea');
        textArea.value = formattedInfo;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('API信息已复制到剪贴板');
    });
}

// 清除所有历史记录
function clearAllHistory() {
    if (confirm('确定要清除所有历史记录吗？这将清空左右两边的所有对话历史。')) {
        // 清空历史记录
        conversationHistory.official = [];
        conversationHistory.thirdParty = [];
        
        // 清空显示区域
        document.getElementById('official-history').innerHTML = '';
        document.getElementById('third-party-history').innerHTML = '';
        
        // 清空所有API详情
        apiDetailsStorage = {};
        saveApiDetails();
        
        // 保存空的历史记录
        saveHistory();
        
        // 显示成功提示
        showNotification('所有历史记录已清除');
    }
}

// 显示通知
function showNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 3秒后自动移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}



// 清空历史记录（可选功能）
function clearHistory(type) {
    if (confirm('确定要清空历史记录吗？')) {
        conversationHistory[type === 'official' ? 'official' : 'thirdParty'] = [];
        const container = document.getElementById(type === 'official' ? 'official-history' : 'third-party-history');
        container.innerHTML = '';
        // 清理相关的API详情
        for (let key in apiDetailsStorage) {
            if (key.startsWith(type)) {
                delete apiDetailsStorage[key];
            }
        }
        saveApiDetails();
        saveHistory();
    }
} 