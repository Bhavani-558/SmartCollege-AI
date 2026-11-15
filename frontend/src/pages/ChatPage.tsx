import React, { useState } from "react";
import { ChatHistoryDialog } from "../components/ChatHistoryDialog";
import { ChatWindow } from "../components/ChatWindow";
import { useCollege } from "../contexts/CollegeContext";
import { useChatSession } from "../hooks/useChatSession";
import { MainLayout } from "../layouts/MainLayout";

export const ChatPage: React.FC = () => {
  const { selectedCollege, contextVersion, lastSwitchNotice, selectCollege } =
    useCollege();
  const [faqsModalOpen, setFaqsModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const {
    messages,
    conversations,
    activeConversationId,
    isSending,
    chatError,
    sendQuestion,
    updateMessageFeedback,
    clearConversation,
    restoreConversation,
    deleteConversation,
    deleteAllHistory,
    dismissChatError,
  } = useChatSession(selectedCollege, contextVersion, lastSwitchNotice, selectCollege);

  return (
    <MainLayout
      onOpenHistoryModal={() => setHistoryModalOpen(true)}
      onOpenFaqsModal={selectedCollege ? () => setFaqsModalOpen(true) : undefined}
      historyCount={conversations.length}
    >
      <ChatWindow
        messages={messages}
        isSending={isSending}
        chatError={chatError}
        faqsModalOpen={faqsModalOpen}
        onSetFaqsModalOpen={setFaqsModalOpen}
        onSendQuestion={sendQuestion}
        onClearConversation={clearConversation}
        onDismissChatError={dismissChatError}
        onFeedbackChange={updateMessageFeedback}
      />

      <ChatHistoryDialog
        open={historyModalOpen}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onClose={() => setHistoryModalOpen(false)}
        onSelectConversation={restoreConversation}
        onDeleteConversation={deleteConversation}
        onDeleteAllHistory={deleteAllHistory}
      />
    </MainLayout>
  );
};
