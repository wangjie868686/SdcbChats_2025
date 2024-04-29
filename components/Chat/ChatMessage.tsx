import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconTrash,
  IconUser,
} from '@/components/Icons/index';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { updateConversation } from '@/utils/conversation';
import { Message } from '@/types/chat';
import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';
import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { HomeContext } from '@/pages/home/home';

export interface Props {
  id: string;
  parentId: string | null;
  lastLeafId: string;
  childrenIds: string[];
  parentChildrenIds: string[];
  message: Message;
  onChangeMessage?: (messageId: string) => void;
  onEdit?: (editedMessage: Message, parentId: string | null) => void;
}

export const ChatMessage: FC<Props> = memo(
  ({
    id,
    parentChildrenIds,
    childrenIds,
    parentId,
    message,
    onEdit,
    onChangeMessage,
  }) => {
    const { t } = useTranslation('chat');
    const {
      state: {
        currentMessages,
        lastLeafId,
        selectChatId,
        selectedConversation,
        conversations,
        messageIsStreaming,
      },
      dispatch: homeDispatch,
    } = useContext(HomeContext);

    function findRootIdByLastLeafId(
      nodes: any[],
      leafId: string
    ): string | null {
      const parentIdMap = new Map<string, string>();
      for (const node of nodes) {
        parentIdMap.set(node.id, node.parentId);
      }

      let currentId = leafId;
      while (true) {
        const parentId = parentIdMap.get(currentId);
        if (!parentId || parentId === '') {
          return currentId;
        } else {
          currentId = parentId;
        }
      }
    }

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);
    const [currentIndex, setSelectCurrentIndex] = useState(
      !parentId
        ? parentChildrenIds.findIndex(
            (x) =>
              x ===
              findRootIdByLastLeafId(currentMessages.reverse(), lastLeafId)
          ) || 0
        : childrenIds
        ? parentChildrenIds.findIndex((x) => x === id)
        : 0
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const toggleEditing = () => {
      setIsEditing(!isEditing);
    };

    const handleInputChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>
    ) => {
      setMessageContent({
        text: event.target.value,
        image: message.content.image,
      });
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    const handleEditMessage = () => {
      if (message.content != messageContent) {
        if (selectChatId && onEdit) {
          onEdit({ ...message, content: messageContent }, parentId);
        }
      }
      setIsEditing(false);
    };

    const handleDeleteMessage = () => {
      if (!selectedConversation) return;

      const { messages } = selectedConversation;
      const findIndex = messages.findIndex((elm) => elm === message);

      if (findIndex < 0) return;

      if (
        findIndex < messages.length - 1 &&
        messages[findIndex + 1].role === 'assistant'
      ) {
        messages.splice(findIndex, 2);
      } else {
        messages.splice(findIndex, 1);
      }
      const updatedConversation = {
        ...selectedConversation,
        messages,
      };

      const { single, all } = updateConversation(
        updatedConversation,
        conversations
      );
      homeDispatch({ field: 'selectedConversation', value: single });
      homeDispatch({ field: 'conversations', value: all });
    };

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault();
        handleEditMessage();
      }
    };

    const copyOnClick = () => {
      if (!navigator.clipboard) return;

      navigator.clipboard.writeText(message.content.text || '').then(() => {
        setMessageCopied(true);
        setTimeout(() => {
          setMessageCopied(false);
        }, 2000);
      });
    };

    useEffect(() => {
      setMessageContent(message.content);
    }, [message.content]);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [isEditing]);

    return (
      <div
        className={`group md:px-4 ${
          message.role === 'assistant'
            ? 'text-gray-800 dark:text-gray-100'
            : 'text-gray-800 dark:text-gray-100'
        }`}
        style={{ overflowWrap: 'anywhere' }}
      >
        <div className='relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-5xl'>
          <div className='min-w-[40px] text-right font-bold'>
            {message.role === 'assistant' ? (
              <IconRobot size={30} />
            ) : (
              <IconUser size={30} />
            )}
          </div>

          <div className='prose mt-[2px] w-full dark:prose-invert'>
            {message.role === 'user' ? (
              <>
                {isEditing ? (
                  <div className='flex w-full flex-col'>
                    <textarea
                      ref={textareaRef}
                      className='w-full resize-none whitespace-pre-wrap border-none dark:bg-[#343541]'
                      value={messageContent.text}
                      onChange={handleInputChange}
                      onKeyDown={handlePressEnter}
                      onCompositionStart={() => setIsTyping(true)}
                      onCompositionEnd={() => setIsTyping(false)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        padding: '0',
                        margin: '0',
                        overflow: 'hidden',
                      }}
                    />

                    <div className='mt-10 flex justify-center space-x-4'>
                      <button
                        className='h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50'
                        onClick={handleEditMessage}
                        disabled={
                          (messageContent.text || '')?.trim().length <= 0
                        }
                      >
                        {t('Save & Submit')}
                      </button>
                      <button
                        className='h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        onClick={() => {
                          setMessageContent(message.content);
                          setIsEditing(false);
                        }}
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className='flex flex-wrap gap-2'>
                      {message.content?.image &&
                        message.content.image.map((img, index) => (
                          <img
                            className='rounded-md mr-2'
                            key={index}
                            style={{ maxWidth: 268, maxHeight: 168 }}
                            src={img}
                            alt=''
                          />
                        ))}
                    </div>
                    <div
                      className={`prose whitespace-pre-wrap dark:prose-invert ${
                        message.content?.image &&
                        message.content.image.length > 0
                          ? 'mt-2'
                          : ''
                      }`}
                    >
                      {message.content.text}
                    </div>
                  </div>
                )}

                {!isEditing && (
                  <div className='flex gap-2'>
                    <>
                      {parentChildrenIds.length > 1 && (
                        <div className='flex gap-1 text-sm'>
                          <button
                            className={
                              currentIndex === 0
                                ? 'text-gray-400'
                                : 'cursor-pointer'
                            }
                            disabled={currentIndex === 0}
                            onClick={() => {
                              if (onChangeMessage) {
                                const index = currentIndex - 1;
                                setSelectCurrentIndex(index);
                                onChangeMessage(parentChildrenIds[index]);
                              }
                            }}
                          >
                            &lt;
                          </button>
                          <span>
                            {`${currentIndex + 1}/${parentChildrenIds.length}`}
                          </span>
                          <button
                            className={
                              currentIndex === parentChildrenIds.length - 1
                                ? 'text-gray-400'
                                : 'cursor-pointer'
                            }
                            disabled={
                              currentIndex === parentChildrenIds.length - 1
                            }
                            onClick={() => {
                              if (onChangeMessage) {
                                const index = currentIndex + 1;
                                setSelectCurrentIndex(index);
                                onChangeMessage(parentChildrenIds[index]);
                              }
                            }}
                          >
                            &gt;
                          </button>
                        </div>
                      )}
                    </>
                    <button
                      className='invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      onClick={toggleEditing}
                    >
                      <IconEdit />
                    </button>
                    <button
                      className='invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      onClick={handleDeleteMessage}
                    >
                      <IconTrash />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className='flex flex-row pr-4'>
                  <MemoizedReactMarkdown
                    className='prose dark:prose-invert flex-1 leading-8 overflow-x-scroll'
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeMathjax]}
                    components={{
                      code({ node, className, inline, children, ...props }) {
                        if (children.length) {
                          if (children[0] == '▍') {
                            return (
                              <span className='animate-pulse cursor-default mt-1'>
                                ▍
                              </span>
                            );
                          }

                          children[0] = (children[0] as string).replace(
                            '`▍`',
                            '▍'
                          );
                        }

                        const match = /language-(\w+)/.exec(className || '');

                        return !inline ? (
                          <CodeBlock
                            key={Math.random()}
                            language={(match && match[1]) || ''}
                            value={String(children).replace(/\n$/, '')}
                            {...props}
                          />
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                      table({ children }) {
                        return (
                          <table className='border-collapse border border-black px-3 py-1 dark:border-white'>
                            {children}
                          </table>
                        );
                      },
                      th({ children }) {
                        return (
                          <th className='break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white'>
                            {children}
                          </th>
                        );
                      },
                      td({ children }) {
                        return (
                          <td className='break-words border border-black px-3 py-1 dark:border-white'>
                            {children}
                          </td>
                        );
                      },
                    }}
                  >
                    {`${message.content.text}${
                      messageIsStreaming
                        ? // && id == (selectedConversation?.messages.length ?? 0) - 1
                          '`▍`'
                        : ''
                    }`}
                  </MemoizedReactMarkdown>
                </div>

                <div className='flex gap-2'>
                  {messagedCopied ? (
                    <IconCheck className='text-green-500 dark:text-green-400' />
                  ) : (
                    <button
                      className='invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      onClick={copyOnClick}
                    >
                      <IconCopy />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);
ChatMessage.displayName = 'ChatMessage';
