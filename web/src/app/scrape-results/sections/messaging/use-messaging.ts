"use client";

import { useState, useCallback, useRef } from "react";
import type { MessageRecipient, MessageTopic } from "../../../../../../scrapers/myChart/messages/sendMessage";

export function useMessaging(token: string) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showComposeNew, setShowComposeNew] = useState(false);
  const [composeRecipients, setComposeRecipients] = useState<MessageRecipient[]>([]);
  const [composeTopics, setComposeTopics] = useState<MessageTopic[]>([]);
  const [composeLoading, setComposeLoading] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<MessageRecipient | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<MessageTopic | null>(null);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sendingNew, setSendingNew] = useState(false);
  const [messageStatus, setMessageStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendReply = useCallback(async (conversationId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    setMessageStatus(null);
    try {
      const resp = await fetch('/api/messages/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, conversationId, messageBody: replyText }),
      });
      const data = await resp.json();
      if (data.success) {
        setMessageStatus({ type: 'success', text: 'Reply sent successfully' });
        setReplyText("");
        setReplyingTo(null);
      } else {
        setMessageStatus({ type: 'error', text: data.error || 'Failed to send reply' });
      }
    } catch (err) {
      setMessageStatus({ type: 'error', text: (err as Error).message });
    } finally {
      setSendingReply(false);
    }
  }, [token, replyText]);

  const handleOpenCompose = useCallback(async () => {
    setShowComposeNew(true);
    if (composeRecipients.length > 0) return;
    setComposeLoading(true);
    try {
      const resp = await fetch('/api/messages/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await resp.json();
      setComposeRecipients(data.recipients || []);
      setComposeTopics(data.topics || []);
      if (data.recipients?.length > 0) setSelectedRecipient(data.recipients[0]);
      if (data.topics?.length > 0) setSelectedTopic(data.topics[0]);
    } catch (err) {
      setMessageStatus({ type: 'error', text: 'Failed to load recipients: ' + (err as Error).message });
    } finally {
      setComposeLoading(false);
    }
  }, [token, composeRecipients.length]);

  const handleSendNew = useCallback(async () => {
    if (!selectedRecipient || !selectedTopic || !composeSubject.trim() || !composeBody.trim()) return;
    setSendingNew(true);
    setMessageStatus(null);
    try {
      const resp = await fetch('/api/messages/send-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          recipient: selectedRecipient,
          topic: selectedTopic,
          subject: composeSubject,
          messageBody: composeBody,
        }),
      });
      const data = await resp.json();
      if (data.success) {
        setMessageStatus({ type: 'success', text: 'Message sent successfully' });
        setComposeSubject("");
        setComposeBody("");
        setShowComposeNew(false);
      } else {
        setMessageStatus({ type: 'error', text: data.error || 'Failed to send message' });
      }
    } catch (err) {
      setMessageStatus({ type: 'error', text: (err as Error).message });
    } finally {
      setSendingNew(false);
    }
  }, [token, selectedRecipient, selectedTopic, composeSubject, composeBody]);

  return {
    replyingTo, setReplyingTo, replyText, setReplyText, sendingReply,
    showComposeNew, setShowComposeNew, composeRecipients, composeTopics,
    composeLoading, selectedRecipient, setSelectedRecipient, selectedTopic,
    setSelectedTopic, composeSubject, setComposeSubject, composeBody, setComposeBody,
    sendingNew, messageStatus, replyTextareaRef,
    handleSendReply, handleOpenCompose, handleSendNew,
  };
}
