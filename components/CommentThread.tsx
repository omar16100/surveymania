"use client"
import { useEffect, useState } from 'react'
import { Button, Badge, Card } from '@/components/ui'
import { showToast } from '@/components/Toast'

type Author = {
  clerkId: string
  firstName: string
  lastName: string
  avatar: string
  email: string
}

type Comment = {
  id: string
  content: string
  authorId: string
  author: Author
  parentId: string | null
  isResolved: boolean
  resolvedAt: string | null
  resolvedBy: { clerkId: string; firstName: string; lastName: string } | null
  mentions: string[]
  createdAt: string
  updatedAt: string
  replies?: Comment[]
}

type Props = {
  responseId: string
  currentUserId: string
}

export default function CommentThread({ responseId, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  // Load comments
  useEffect(() => {
    loadComments()
  }, [responseId])

  // Real-time subscription via SSE
  useEffect(() => {
    const eventSource = new EventSource(`/api/responses/${responseId}/sse`)

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)

        // Handle different event types
        if (payload.type === 'comment:new') {
          // Reload comments to get the new one with proper structure
          loadComments()
          // Don't show toast for own comments
          if (payload.data.author.clerkId !== currentUserId) {
            showToast(`New comment from ${payload.data.author.firstName}`, 'info', 3000)
          }
        } else if (payload.type === 'comment:updated') {
          loadComments()
        } else if (payload.type === 'comment:deleted') {
          setComments(prev => prev.filter(c => c.id !== payload.data.id))
        } else if (payload.type === 'comment:resolved') {
          loadComments()
        }
      } catch (error) {
        console.error('SSE message parse error:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      eventSource.close()
    }

    // Cleanup
    return () => {
      eventSource.close()
    }
  }, [responseId, currentUserId])

  async function loadComments() {
    try {
      const res = await fetch(`/api/responses/${responseId}/comments`)
      const data = await res.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Load comments error:', error)
      showToast('Failed to load comments', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateComment() {
    if (!newComment.trim()) return

    try {
      const res = await fetch(`/api/responses/${responseId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })

      if (!res.ok) throw new Error('Failed to create comment')

      const data = await res.json()
      setComments(prev => [data.comment, ...prev])
      setNewComment('')
      showToast('Comment added', 'success')
    } catch (error) {
      console.error('Create comment error:', error)
      showToast('Failed to add comment', 'error')
    }
  }

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) return

    try {
      const res = await fetch(`/api/responses/${responseId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parentId })
      })

      if (!res.ok) throw new Error('Failed to create reply')

      await loadComments() // Reload to get updated replies
      setReplyingTo(null)
      setReplyContent('')
      showToast('Reply added', 'success')
    } catch (error) {
      console.error('Reply error:', error)
      showToast('Failed to add reply', 'error')
    }
  }

  async function handleEdit(commentId: string) {
    if (!editContent.trim()) return

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })

      if (!res.ok) throw new Error('Failed to update comment')

      await loadComments()
      setEditingId(null)
      setEditContent('')
      showToast('Comment updated', 'success')
    } catch (error) {
      console.error('Update comment error:', error)
      showToast('Failed to update comment', 'error')
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment and all its replies?')) return

    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete comment')

      setComments(prev => prev.filter(c => c.id !== commentId))
      showToast('Comment deleted', 'success')
    } catch (error) {
      console.error('Delete comment error:', error)
      showToast('Failed to delete comment', 'error')
    }
  }

  async function handleResolve(commentId: string, isResolved: boolean) {
    try {
      const res = await fetch(`/api/comments/${commentId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: !isResolved })
      })

      if (!res.ok) throw new Error('Failed to resolve comment')

      await loadComments()
      showToast(isResolved ? 'Comment reopened' : 'Comment resolved', 'success')
    } catch (error) {
      console.error('Resolve comment error:', error)
      showToast('Failed to update comment', 'error')
    }
  }

  function renderComment(comment: Comment, isReply = false) {
    const isAuthor = comment.authorId === currentUserId
    const isEditing = editingId === comment.id
    const isReplying = replyingTo === comment.id

    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 mt-2' : 'mt-4'} border-l-2 ${comment.isResolved ? 'border-green-300' : 'border-gray-200'} pl-4`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
            {comment.author.firstName[0]}{comment.author.lastName[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{comment.author.firstName} {comment.author.lastName}</span>
              <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
              {comment.isResolved && (
                <Badge variant="default" className="text-xs bg-green-100 text-green-800">Resolved</Badge>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => handleEdit(comment.id)}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditContent('') }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
            )}

            <div className="flex gap-3 mt-2">
              {!isReply && (
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => { setReplyingTo(comment.id); setReplyContent('') }}
                >
                  Reply
                </button>
              )}
              {isAuthor && !isEditing && (
                <>
                  <button
                    className="text-xs text-gray-600 hover:underline"
                    onClick={() => { setEditingId(comment.id); setEditContent(comment.content) }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => handleDelete(comment.id)}
                  >
                    Delete
                  </button>
                </>
              )}
              {!isReply && (
                <button
                  className="text-xs text-gray-600 hover:underline"
                  onClick={() => handleResolve(comment.id, comment.isResolved)}
                >
                  {comment.isResolved ? 'Reopen' : 'Resolve'}
                </button>
              )}
            </div>

            {isReplying && (
              <div className="mt-3">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full p-2 border rounded text-sm"
                  rows={2}
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => handleReply(comment.id)}>Reply</Button>
                  <Button size="sm" variant="outline" onClick={() => { setReplyingTo(null); setReplyContent('') }}>Cancel</Button>
                </div>
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-2">
                {comment.replies.map(reply => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading comments...</div>
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Comments ({comments.length})</h3>

        <div className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-3 border rounded-md"
            rows={3}
          />
          <Button className="mt-2" onClick={handleCreateComment} disabled={!newComment.trim()}>
            Add Comment
          </Button>
        </div>

        <div className="space-y-2">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No comments yet. Be the first to comment!</p>
          ) : (
            comments.map(comment => renderComment(comment))
          )}
        </div>
      </Card>
    </div>
  )
}
