import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies as cookiesFn } from 'next/headers';
import InboxClientView from './InboxClientView';

type OrderVersionStatus = 'pending_review' | 'rejected' | 'approved';

type OrderVersion = {
  id: string;
  version_number: number;
  content_url: string;
  prompt_data: { raw: string };
  creator_notes: string;
  status: OrderVersionStatus;
  buyer_feedback?: string;
  created_at: string;
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  order_id: number;
};

type Order = {
  id: number;
  buyer_id: string;
  service_owner_id: string;
  status: string;
  created_at: string;
  service_snapshot: {
    title: string;
    price: number;
    package_name: string;
  };
};

type UserProfile = {
  id: string;
  full_name: string;
  avatar_url: string;
};

export default async function InboxDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const orderId = Number(params.id);
  if (isNaN(orderId)) {
    return notFound();
  }

  const cookieStore = await cookiesFn();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // Fetch data in parallel
  const [
    { data: { session } },
    { data: order },
    { data: messages },
    { data: versions },
    { data: currentUser },
  ] = await Promise.all([
    supabase.auth.getSession(),
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single(),
    supabase
      .from('messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
    supabase
      .from('order_versions')
      .select('*')
      .eq('order_id', orderId)
      .order('version_number', { ascending: true }),
    supabase.auth.getUser(),
  ]);

  // Check if user is authenticated and has access to this order
  if (!session || !order || 
      (order.buyer_id !== session.user.id && order.service_owner_id !== session.user.id)) {
    return notFound();
  }

  // Get user profiles for the conversation
  const userIds = [order.buyer_id, order.service_owner_id].filter(Boolean);
  const { data: userProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const userMap = userProfiles?.reduce<Record<string, UserProfile>>((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});

  // Determine if current user is the buyer or seller
  const isBuyer = session.user.id === order.buyer_id;
  const otherUser = isBuyer 
    ? userMap?.[order.service_owner_id]
    : userMap?.[order.buyer_id];

  // Transform data for client
  const transformedMessages = (messages || []).map(msg => ({
    id: msg.id.toString(),
    from: msg.sender_id === session.user.id ? 'me' as const : 'them' as const,
    text: msg.content,
    time: new Date(msg.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }));

  const transformedVersions = (versions || []).map(ver => ({
    id: ver.id,
    versionNumber: ver.version_number,
    contentUrl: ver.content_url,
    promptRaw: typeof ver.prompt_data === 'object' 
      ? JSON.stringify(ver.prompt_data.raw, null, 2) 
      : '{}',
    notes: ver.creator_notes || '',
    status: ver.status,
    buyerFeedback: ver.buyer_feedback || undefined,
    createdAt: new Date(ver.created_at).getTime()
  }));

  const currentVersion = transformedVersions.reduce((prev, current) => 
    (prev.versionNumber > current.versionNumber ? prev : current), 
    { versionNumber: 0 } as any
  );

  return (
    <InboxClientView
      orderId={orderId}
      isBuyer={isBuyer}
      serviceTitle={order.service_snapshot?.title || '未知服务'}
      otherUser={{
        id: otherUser?.id || (isBuyer ? order.service_owner_id : order.buyer_id),
        name: otherUser?.full_name || (isBuyer ? '卖家' : '买家'),
        avatarUrl: otherUser?.avatar_url || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=96&q=80'
      }}
      initialMessages={transformedMessages}
      initialVersions={transformedVersions}
      currentVersion={currentVersion}
      remainingRevisions={3 - (versions?.filter(v => v.status === 'rejected').length || 0)}
      maxRevisions={3}
    />
  );
}