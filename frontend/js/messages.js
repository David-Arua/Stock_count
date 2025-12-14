document.addEventListener('DOMContentLoaded', () => {
    const user = window.AppAPI.getCurrentUser();
    if (!user) {
        alert('Please login first');
        location.href = 'index.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;

    const conversationsList = document.getElementById('conversationsList');
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const chatHeader = document.getElementById('chatHeader');
    const chatPlaceholder = document.getElementById('chatPlaceholder');

    let currentChatUserId = null;

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    async function renderConversations() {
        const conversations = await window.AppAPI.getConversations(user.id); // returns list of contactIds
        const items = await Promise.all(conversations.map(async (conv) => {
            const otherId = conv.contactId || conv.userId || conv.contactid || conv.userid;
            const otherUser = await window.AppAPI.getUser(otherId);
            const thread = await window.AppAPI.getMessages(user.id, otherId);
            const lastMessage = thread[thread.length - 1];
            const time = lastMessage ? new Date(lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return `
                <div class="conversation-item ${otherId === currentChatUserId ? 'active' : ''}" onclick="openChat('${otherId}')">
                    <h3>${escapeHtml(otherUser?.name || 'Unknown')}</h3>
                    <p class="last-message">${escapeHtml((lastMessage?.text || '').substring(0, 40))}${lastMessage ? '...' : ''}</p>
                    <span class="time">${time}</span>
                </div>
            `;
        }));
        conversationsList.innerHTML = items.join('') || '<p class="empty-state">No conversations yet. Start one from a product page!</p>';
    }

    async function renderMessages() {
        if (!currentChatUserId) return;
        
        const messages = await window.AppAPI.getMessages(user.id, currentChatUserId);
        chatMessages.innerHTML = messages.map(msg => {
            const isMe = msg.senderId === user.id;
            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="message ${isMe ? 'sent' : 'received'}">
                    <p>${escapeHtml(msg.text)}</p>
                    <span class="time">${time}</span>
                </div>
            `;
        }).join('') || '<p class="empty-state">No messages yet. Start the conversation!</p>';
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    window.openChat = async (userId) => {
        currentChatUserId = userId;
        const otherUser = await window.AppAPI.getUser(userId);
        
        chatPlaceholder.style.display = 'none';
        chatHeader.style.display = 'block';
        chatForm.style.display = 'flex';
        
        document.getElementById('chatUserName').textContent = otherUser?.name || 'Unknown';
        document.getElementById('chatUserInfo').textContent = `${otherUser?.type === 'farmer' ? '👨‍🌾 Farmer' : '🛍️ Vendor'} | ${otherUser?.location || 'Unknown location'}`;
        
        await renderMessages();
        await renderConversations();
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentChatUserId) return;
        
        const text = messageInput.value.trim();
        if (!text) return;
        
        await window.AppAPI.sendMessage({
            senderId: user.id,
            recipientId: currentChatUserId,
            text
        });
        
        messageInput.value = '';
        await renderMessages();
        await renderConversations();
    });

    // Check if opening from URL (e.g., from product page or request)
    const urlParams = new URLSearchParams(window.location.search);
    const chatUserId = urlParams.get('chat');
    if (chatUserId) {
        openChat(chatUserId);
    }

    renderConversations();
});
