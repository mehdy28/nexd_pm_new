

// "use client";

// import React, { useState, useRef, ChangeEvent } from "react";

// interface Message {
//   sender: string;
//   type: "text" | "file";
//   content: string;
//   fileUrl?: string;
//   time: string;
// }

// interface Chat {
//   name: string;
//   lastMessage: string;
//   messages: Message[];
//   unread?: number;
// }

// const mockChats: { section: string; chats: Chat[] }[] = [
//   {
//     section: "Support",
//     chats: [
//       {
//         name: "Support 1",
//         lastMessage: "Hello! How are you?",
//         unread: 2,
//         messages: [
//           { sender: "support", type: "text", content: "Hello! How are you?", time: "07:41 AM" },
//         ],
//       },
//       {
//         name: "Support 2",
//         lastMessage: "Hi there!",
//         messages: [{ sender: "support", type: "text", content: "Hi there!", time: "07:30 AM" }],
//       },
//     ],
//   },
//   {
//     section: "Team Members",
//     chats: [
//       {
//         name: "Alice",
//         lastMessage: "Reminder: Meeting at 3pm",
//         unread: 1,
//         messages: [
//           { sender: "team", type: "text", content: "Reminder: Meeting at 3pm", time: "07:20 AM" },
//         ],
//       },
//       { name: "Bob", lastMessage: "Check your email", messages: [] },
//       { name: "Charlie", lastMessage: "Can you review?", messages: [] },
//     ],
//   },
//   {
//     section: "Clients",
//     chats: [
//       { name: "Client A", lastMessage: "Hi Client A", messages: [] },
//       { name: "Client B", lastMessage: "Please review the document", messages: [] },
//     ],
//   },
// ];

// export default function SupportChat() {
//   const [activeChat, setActiveChat] = useState<Chat | null>(mockChats[0].chats[0]);
//   const [inputValue, setInputValue] = useState("");
//   const fileInputRef = useRef<HTMLInputElement | null>(null);
//   const chatEndRef = useRef<HTMLDivElement | null>(null);

//   const handleSendMessage = () => {
//     if (!inputValue.trim() || !activeChat) return;

//     const newMessage: Message = {
//       sender: "user",
//       type: "text",
//       content: inputValue,
//       time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
//     };

//     activeChat.messages.push(newMessage);
//     setInputValue("");
//     scrollToBottom();
//   };

//   const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
//     if (!activeChat) return;
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const fileType = file.type.startsWith("image/") ? "image" : "file";
//     const newMessage: Message = {
//       sender: "user",
//       type: "file",
//       content: file.name,
//       fileUrl: URL.createObjectURL(file),
//       time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
//     };

//     activeChat.messages.push(newMessage);
//     if (fileInputRef.current) fileInputRef.current.value = "";
//     scrollToBottom();
//   };

//   const scrollToBottom = () => {
//     setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
//   };

//   return (
//     <div className="fixed left-20 right-0 top-20 bottom-0 bg-background overflow-hidden">
//       <div className="h-full w-full overflow-auto bg-muted/30 p-4">
//         <div className="flex h-full gap-4">
//           {/* Sidebar */}
//           <div className="w-80 bg-white rounded-lg shadow-md flex-shrink-0 overflow-y-auto p-3">
//             {mockChats.map((section) => (
//               <div key={section.section} className="mb-6">
//                 <h3 className="font-semibold mb-2">{section.section}</h3>
//                 <div className="flex flex-col gap-2">
//                   {section.chats.map((chat) => (
//                     <div
//                       key={chat.name}
//                       className={`flex flex-col p-2 rounded cursor-pointer hover:bg-gray-100 ${
//                         activeChat?.name === chat.name ? "bg-gray-200" : ""
//                       }`}
//                       onClick={() => setActiveChat(chat)}
//                     >
//                       <div className="flex items-center gap-2">
//                         <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
//                           {chat.name[0]}
//                         </span>
//                         <span className="text-sm truncate">{chat.name}</span>
//                         {chat.unread && (
//                           <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
//                             {chat.unread}
//                           </span>
//                         )}
//                       </div>
//                       <div className="text-xs text-gray-400 truncate mt-1">{chat.lastMessage}</div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Chat area */}
//           <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
//             {/* Chat header */}
//             <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
//               <div className="flex items-center gap-2">
//                 <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
//                   {activeChat?.name[0]}
//                 </span>
//                 <span className="font-semibold">{activeChat?.name}</span>
//               </div>
//             </div>

//             {/* Chat messages */}
//             <div className="flex-1 overflow-y-auto p-4 space-y-4">
//               {activeChat?.messages.map((msg, idx) => (
//                 <div
//                   key={idx}
//                   className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
//                 >
//                   <div
//                     className={`flex flex-col px-4 py-2 rounded-2xl shadow-sm break-words whitespace-pre-wrap max-w-[70%] ${
//                       msg.sender === "user"
//                         ? "bg-[#4ab5ae] text-white rounded-br-none"
//                         : "bg-gray-50 text-gray-800 rounded-bl-none"
//                     }`}
//                   >
//                     {msg.type === "text" && <p>{msg.content}</p>}

//                     {msg.type === "file" && (
//                       <>
//                         {msg.fileUrl?.match(/\.(jpeg|jpg|gif|png)$/) ? (
//                           <img
//                             src={msg.fileUrl}
//                             alt={msg.content}
//                             className="max-w-full rounded-md mb-1"
//                           />
//                         ) : (
//                           <div className="flex items-center gap-2">
//                             <span className="text-sm font-medium">{msg.content}</span>
//                             <a
//                               href={msg.fileUrl}
//                               download={msg.content}
//                               className="underline text-blue-600 hover:text-blue-800"
//                             >
//                               Download
//                             </a>
//                           </div>
//                         )}
//                       </>
//                     )}
//                     <span className="text-xs mt-1 text-gray-500">{msg.time}</span>
//                   </div>
//                 </div>
//               ))}
//               <div ref={chatEndRef} />
//             </div>

//             {/* Input area */}
//             <div className="p-3 border-t flex items-center gap-2 flex-shrink-0">
//               <button className="inline-flex items-center justify-center gap-2 h-10 w-10 bg-gray-200 rounded-full">
//                 😊
//               </button>
//               <label className="cursor-pointer">
//                 <input
//                   ref={fileInputRef}
//                   className="hidden"
//                   type="file"
//                   onChange={handleFileUpload}
//                 />
//                 <svg
//                   className="h-5 w-5 text-gray-500"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
//                   />
//                 </svg>
//               </label>
//               <input
//                 className="flex h-10 w-full border border-input text-base placeholder:text-gray-400 rounded-full px-4 py-2 bg-gray-100 focus:outline-none focus:ring-0"
//                 placeholder="Type your message..."
//                 value={inputValue}
//                 onChange={(e) => setInputValue(e.target.value)}
//                 onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
//               />
//               <button
//                 onClick={handleSendMessage}
//                 className="h-10 py-2 px-6 rounded-full bg-[#4ab5ae] text-white hover:bg-[#3b918c]"
//               >
//                 Send
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }







"use client";

import React, { useState, useRef, ChangeEvent } from "react";

interface Message {
  sender: string;
  type: "text" | "file";
  content: string;
  fileUrl?: string;
  time: string;
}

interface Chat {
  name: string;
  lastMessage: string;
  messages: Message[];
  unread?: number;
}

const mockChats: { section: string; chats: Chat[] }[] = [
  {
    section: "Support",
    chats: [
      {
        name: "Support 1",
        lastMessage: "Hello! How are you?",
        unread: 2,
        messages: [
          { sender: "support", type: "text", content: "Hello! How are you?", time: "07:41 AM" },
        ],
      },
      {
        name: "Support 2",
        lastMessage: "Hi there!",
        messages: [{ sender: "support", type: "text", content: "Hi there!", time: "07:30 AM" }],
      },
    ],
  },
  {
    section: "Team Members",
    chats: [
      {
        name: "Alice",
        lastMessage: "Reminder: Meeting at 3pm",
        unread: 1,
        messages: [
          { sender: "team", type: "text", content: "Reminder: Meeting at 3pm", time: "07:20 AM" },
        ],
      },
      { name: "Bob", lastMessage: "Check your email", messages: [] },
      { name: "Charlie", lastMessage: "Can you review?", messages: [] },
    ],
  },
  {
    section: "Clients",
    chats: [
      { name: "Client A", lastMessage: "Hi Client A", messages: [] },
      { name: "Client B", lastMessage: "Please review the document", messages: [] },
    ],
  },
];

export default function SupportChat() {
  const [activeChat, setActiveChat] = useState<Chat | null>(mockChats[0].chats[0]);
  const [inputValue, setInputValue] = useState("");
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const handleSendMessage = () => {
    if ((!inputValue.trim() && !previewFile) || !activeChat) return;

    const messagesToAdd: Message[] = [];

    if (inputValue.trim()) {
      messagesToAdd.push({
        sender: "user",
        type: "text",
        content: inputValue,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    if (previewFile && previewUrl) {
      messagesToAdd.push({
        sender: "user",
        type: "file",
        content: previewFile.name,
        fileUrl: previewUrl,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    activeChat.messages.push(...messagesToAdd);

    setInputValue("");
    setPreviewFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    scrollToBottom();
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const scrollToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="fixed left-20 right-0 top-20 bottom-0 bg-background overflow-hidden">
      <div className="h-full w-full overflow-auto bg-muted/30 p-4">
        <div className="flex h-full gap-4">
          {/* Sidebar */}
          <div className="w-80 bg-white rounded-lg shadow-md flex-shrink-0 overflow-y-auto p-3">
            {mockChats.map((section) => (
              <div key={section.section} className="mb-6">
                <h3 className="font-semibold mb-2">{section.section}</h3>
                <div className="flex flex-col gap-2">
                  {section.chats.map((chat) => (
                    <div
                      key={chat.name}
                      className={`flex flex-col p-2 rounded cursor-pointer hover:bg-gray-100 ${
                        activeChat?.name === chat.name ? "bg-gray-200" : ""
                      }`}
                      onClick={() => setActiveChat(chat)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                          {chat.name[0]}
                        </span>
                        <span className="text-sm truncate">{chat.name}</span>
                        {chat.unread && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate mt-1">{chat.lastMessage}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
            {/* Chat header */}
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {activeChat?.name[0]}
                </span>
                <span className="font-semibold">{activeChat?.name}</span>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeChat?.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex flex-col px-4 py-2 rounded-2xl shadow-sm break-words whitespace-pre-wrap max-w-[70%] ${
                      msg.sender === "user"
                        ? "bg-[#4ab5ae] text-white rounded-br-none"
                        : "bg-gray-50 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    {msg.type === "text" && <p>{msg.content}</p>}

                    {msg.type === "file" && (
                      <>
                        {msg.fileUrl?.match(/\.(jpeg|jpg|gif|png)$/) ? (
                          <img
                            src={msg.fileUrl}
                            alt={msg.content}
                            className="max-w-full rounded-md mb-1"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{msg.content}</span>
                            <a
                              href={msg.fileUrl}
                              download={msg.content}
                              className="underline text-blue-600 hover:text-blue-800"
                            >
                              Download
                            </a>
                          </div>
                        )}
                      </>
                    )}
                    <span className="text-xs mt-1 text-gray-500">{msg.time}</span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 border-t flex flex-col gap-2 flex-shrink-0">
              {/* Preview uploaded file */}
              {previewFile && previewUrl && (
                <div className="flex items-center gap-2 mb-2">
                  {previewFile.type.startsWith("image/") ? (
                    <img src={previewUrl} alt={previewFile.name} className="h-16 rounded-md" />
                  ) : (
                    <div className="flex items-center justify-between bg-gray-100 rounded-md px-2 py-1 w-full">
                      <span className="truncate">{previewFile.name}</span>
                      <button onClick={() => { setPreviewFile(null); setPreviewUrl(null); }} className="text-red-500 font-bold">x</button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button className="inline-flex items-center justify-center gap-2 h-10 w-10 bg-gray-200 rounded-full">
                  😊
                </button>
                <label className="cursor-pointer">
                  <input
                    ref={fileInputRef}
                    className="hidden"
                    type="file"
                    onChange={handleFileUpload}
                  />
                  <svg
                    className="h-5 w-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
                    />
                  </svg>
                </label>
                <input
                  className="flex h-10 w-full border border-input text-base placeholder:text-gray-400 rounded-full px-4 py-2 bg-gray-100 focus:outline-none focus:ring-0"
                  placeholder="Type your message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  className="h-10 py-2 px-6 rounded-full bg-[#4ab5ae] text-white hover:bg-[#3b918c]"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
