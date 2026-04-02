"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SafeHtml } from "@/components/SafeHtml";
import { ErrorBoundary } from "@/components/with-render-error-boundary";
import { safeText } from "@/components/data-display";
import type { ConversationType, ConversationMessageType } from "@/types/scrape-results";
import type { ScrapeResults } from "@/types/scrape-results";
import { useMessaging } from "./use-messaging";

interface MessagingSectionProps {
  messages: ScrapeResults['messages'];
  isDemo: boolean;
  token: string;
}

export function MessagingSection({ messages, isDemo, token }: MessagingSectionProps) {
  const {
    replyingTo, setReplyingTo, replyText, setReplyText, sendingReply,
    showComposeNew, setShowComposeNew, composeRecipients, composeTopics,
    composeLoading, selectedRecipient, setSelectedRecipient, selectedTopic,
    setSelectedTopic, composeSubject, setComposeSubject, composeBody, setComposeBody,
    sendingNew, messageStatus, replyTextareaRef,
    handleSendReply, handleOpenCompose, handleSendNew,
  } = useMessaging(token);

  if (!messages || messages?.error) return null;

  return (
    <ErrorBoundary name="Messages" data={messages}>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            Conversations
            {messages?.conversations?.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({messages.conversations.length})
              </span>
            )}
          </CardTitle>
          {!isDemo && (
            <Button
              variant={showComposeNew ? "secondary" : "default"}
              size="sm"
              onClick={() => showComposeNew ? setShowComposeNew(false) : handleOpenCompose()}
            >
              {showComposeNew ? "Cancel" : "New Message"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status message */}
        {messageStatus && (
          <div className={`p-2 rounded-md text-sm ${
            messageStatus.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {messageStatus.text}
          </div>
        )}

        {/* Compose new message form */}
        {showComposeNew && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
            <h4 className="font-semibold text-sm">New Message</h4>
            {composeLoading ? (
              <p className="text-sm text-muted-foreground">Loading recipients...</p>
            ) : composeRecipients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recipients available. This MyChart account does not have any providers you can message.
              </p>
            ) : (
              <>
                <div>
                  <label className="text-xs font-medium block mb-1">To</label>
                  <select
                    className="w-full border rounded-md p-2 text-sm bg-white"
                    value={selectedRecipient ? JSON.stringify(selectedRecipient) : ''}
                    onChange={(e) => setSelectedRecipient(JSON.parse(e.target.value))}
                  >
                    {composeRecipients.map((r, i) => (
                      <option key={i} value={JSON.stringify(r)}>
                        {r.displayName}{r.specialty ? ` (${r.specialty})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Topic</label>
                  <select
                    className="w-full border rounded-md p-2 text-sm bg-white"
                    value={selectedTopic ? JSON.stringify(selectedTopic) : ''}
                    onChange={(e) => setSelectedTopic(JSON.parse(e.target.value))}
                  >
                    {composeTopics.map((t, i) => (
                      <option key={i} value={JSON.stringify(t)}>
                        {t.displayName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Subject</label>
                  <input
                    type="text"
                    className="w-full border rounded-md p-2 text-sm"
                    placeholder="Subject"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Message</label>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm min-h-[100px]"
                    placeholder="Type your message..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={sendingNew || !composeSubject.trim() || !composeBody.trim()}
                    onClick={handleSendNew}
                  >
                    {sendingNew ? "Sending..." : "Send Message"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowComposeNew(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {messages?.conversations?.map((convo: ConversationType, i: number) => (
          <details key={i} className="bg-muted rounded-md">
            <summary className="p-3 text-sm cursor-pointer hover:bg-muted/80">
              <div className="inline">
                <span className="font-medium">{safeText(convo.subject)}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {safeText(convo.senderName)} - {safeText(convo.lastMessageDate)}
                </span>
                {convo.messages && convo.messages.length > 0 && (
                  <Badge variant="outline" className="text-[10px] ml-2">
                    {convo.messages.length} message{convo.messages.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {(!convo.messages || convo.messages.length === 0) && convo.preview && (
                <p className="text-xs text-muted-foreground mt-1 ml-4">{convo.preview}</p>
              )}
            </summary>
            {convo.messages && convo.messages.length > 0 && (
              <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                {convo.messages.map((msg: ConversationMessageType, j: number) => (
                  <div
                    key={j}
                    className={`rounded-md p-2 text-xs ${
                      msg.isFromPatient
                        ? 'bg-blue-50 border border-blue-200 ml-8'
                        : 'bg-white border border-gray-200 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {safeText(msg.senderName)}
                        {msg.isFromPatient && (
                          <span className="text-blue-600 ml-1">(you)</span>
                        )}
                      </span>
                      <span className="text-muted-foreground">{safeText(msg.sentDate)}</span>
                    </div>
                    <SafeHtml
                      html={msg.messageBody}
                      token={token}
                      className="text-xs whitespace-pre-wrap"
                    />
                  </div>
                ))}

                {/* Reply section */}
                {!isDemo && (
                  <div className="pt-2 border-t border-border/30">
                    {replyingTo === convo.conversationId ? (
                      <div className="space-y-2">
                        <textarea
                          ref={replyTextareaRef}
                          className="w-full border rounded-md p-2 text-sm min-h-[80px]"
                          placeholder="Type your reply..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              handleSendReply(convo.conversationId);
                            }
                          }}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={sendingReply || !replyText.trim()}
                            onClick={() => handleSendReply(convo.conversationId)}
                          >
                            {sendingReply ? "Sending..." : "Send Reply"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          >
                            Cancel
                          </Button>
                          <span className="text-xs text-muted-foreground self-center">
                            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to send
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setReplyingTo(convo.conversationId);
                          setReplyText("");
                          setTimeout(() => replyTextareaRef.current?.focus(), 50);
                        }}
                      >
                        Reply
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </details>
        )) ?? (
          <p className="text-sm text-muted-foreground">
            Response keys: {Object.keys(messages || {}).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
    </ErrorBoundary>
  );
}
