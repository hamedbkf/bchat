const { useState, useEffect, useRef } = React;

const colors = [
    '#c00000', '#0baf00', '#efa000', '#0d55c5',
    '#4490be', '#11c0bb', '#cf3838', '#9a5ada'
];

function getColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = 31 * hash + name.charCodeAt(i);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
}

function UsernamePage({ onConnect }) {
    const [username, setUsername] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const name = username.trim();
        if (name) {
            onConnect(name);
        }
    };

    return (
        <div id="username-page">
            <div className="username-page-container">
                <h2 className="title">Type your username to enter the Chatroom</h2>
                <form id="usernameForm" name="usernameForm" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input 
                            type="text" 
                            id="name" 
                            placeholder="Username" 
                            autoComplete="off" 
                            className="form-control"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <button type="submit" className="accent username-submit">Start Chatting</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ChatPage({ username }) {
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [connecting, setConnecting] = useState(true);
    const [error, setError] = useState(false);
    const client = useRef(null);
    const messageList = useRef(null);

    useEffect(() => {
        const socket = new SockJS('/ws');
        const stomp = Stomp.over(socket);
        client.current = stomp;

        stomp.connect({}, () => {
            setConnecting(false);
            setError(false);
            
            stomp.subscribe('/topic/public', (payload) => {
                const message = JSON.parse(payload.body);
                setMessages(prev => [...prev, message]);
            });

            stomp.send("/app/chat.addUser",
                {},
                JSON.stringify({sender: username, type: 'JOIN'})
            );
        }, () => {
            setConnecting(false);
            setError(true);
        });

        return () => {
            if (client.current) {
                client.current.disconnect();
            }
        };
    }, [username]);

    useEffect(() => {
        if (messageList.current) {
            messageList.current.scrollTop = messageList.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        const text = messageInput.trim();
        if (text && client.current) {
            const chatMessage = {
                sender: username,
                content: messageInput,
                type: 'CHAT'
            };
            client.current.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            setMessageInput('');
        }
    };

    return (
        <div id="chat-page">
            <div className="chat-container">
                <div className="chat-header">
                    <h2>BChat</h2>
                </div>
                {connecting && !error && (
                    <div className="connecting">
                        Connecting...
                    </div>
                )}
                {error && (
                    <div className="connecting" style={{color: 'red'}}>
                        Could not connect to WebSocket server. Please refresh this page to try again!
                    </div>
                )}
                <ul id="messageArea" ref={messageList}>
                    {messages.map((message, index) => {
                        if (message.type === 'JOIN') {
                            return (
                                <li key={index} className="event-message">
                                    <p>{message.sender} joined!</p>
                                </li>
                            );
                        } else if (message.type === 'LEAVE') {
                            return (
                                <li key={index} className="event-message">
                                    <p>{message.sender} left!</p>
                                </li>
                            );
                        } else {
                            return (
                                <li key={index} className="chat-message">
                                    <i style={{backgroundColor: getColor(message.sender)}}>
                                        {message.sender[0]}
                                    </i>
                                    <span>{message.sender}</span>
                                    <p>{message.content}</p>
                                </li>
                            );
                        }
                    })}
                </ul>
                <form id="messageForm" name="messageForm" onSubmit={handleSendMessage}>
                    <div className="form-group">
                        <div className="input-group clearfix">
                            <input 
                                type="text" 
                                id="message" 
                                placeholder="Type a message..." 
                                autoComplete="off" 
                                className="form-control"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                            />
                            <button type="submit" className="primary">Send</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

function App() {
    const [username, setUsername] = useState(null);

    return (
        <>
            {!username ? (
                <UsernamePage onConnect={setUsername} />
            ) : (
                <ChatPage username={username} />
            )}
        </>
    );
}

ReactDOM.render(<App />, document.getElementById('root'));
