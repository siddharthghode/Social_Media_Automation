from datetime import datetime, timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Post
from auth_app.models import Account


# GET /api/posts/stats
@api_view(['GET'])
def get_stats(request):
    qs = Post.objects.filter(user=request.user)
    connected = Account.objects.filter(user=request.user, status='connected').count()
    return Response({
        'total': qs.count(),
        'pending': qs.filter(status='pending').count(),
        'posted': qs.filter(status='posted').count(),
        'failed': qs.filter(status='failed').count(),
        'connectedAccounts': connected,
    })


# GET /api/posts
@api_view(['GET'])
def get_posts(request):
    posts = Post.objects.filter(user=request.user).order_by('-created_at')
    return Response([p.to_dict() for p in posts])


# POST /api/posts/create
@api_view(['POST'])
def create_post(request):
    d = request.data
    content = d.get('content')
    scheduled = d.get('scheduledTime') or d.get('scheduledFor')
    if not content or not scheduled:
        return Response({'message': 'Content and scheduled time are required'}, status=400)

    image_url = d.get('imageUrl') or d.get('mediaUrl')
    platforms = d.get('platforms') or ([d['platform']] if d.get('platform') else [])
    post = Post.objects.create(
        user=request.user,
        content=content,
        image_url=image_url,
        media_url=image_url,
        media_type=d.get('mediaType') or ('image' if image_url else None),
        scheduled_time=datetime.fromisoformat(scheduled.replace('Z', '+00:00')),
        platforms=platforms,
        platform=d.get('platform') or (platforms[0] if platforms else ''),
    )
    return Response(post.to_dict(), status=201)


# PUT/DELETE /api/posts/:id
@api_view(['PUT', 'DELETE'])
def post_detail(request, post_id):
    post = Post.objects.filter(pk=post_id, user=request.user).first()
    if not post:
        return Response({'message': 'Post not found'}, status=404)

    if request.method == 'DELETE':
        post.delete()
        return Response({'message': 'Post deleted'})

    if post.status != 'pending':
        return Response({'message': 'Only pending posts can be edited'}, status=400)

    d = request.data
    if d.get('content'):
        post.content = d['content']
    if 'imageUrl' in d:
        post.image_url = d['imageUrl']
    if 'mediaUrl' in d:
        post.media_url = d['mediaUrl']
    if 'mediaType' in d:
        post.media_type = d['mediaType']
    scheduled = d.get('scheduledTime') or d.get('scheduledFor')
    if scheduled:
        post.scheduled_time = datetime.fromisoformat(scheduled.replace('Z', '+00:00'))
    if 'platforms' in d:
        post.platforms = d['platforms']
    if 'platform' in d:
        post.platform = d['platform']
    post.save()
    return Response(post.to_dict())
