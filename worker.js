/**
 * Cloudflare Workers API for Pick Video Comment System
 * Handles GET and POST requests for comments stored in D1 database
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // Route: GET /api/comments - 获取所有留言
        if (url.pathname === '/api/comments' && request.method === 'GET') {
            try {
                const { results } = await env.DB.prepare(
                    'SELECT id, nickname, content, created_at FROM comments ORDER BY created_at DESC LIMIT 100'
                ).all();

                return new Response(JSON.stringify({
                    success: true,
                    comments: results
                }), {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                });
            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    error: '获取留言失败'
                }), {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                });
            }
        }

        // Route: POST /api/comments - 提交新留言
        if (url.pathname === '/api/comments' && request.method === 'POST') {
            try {
                const data = await request.json();
                const { nickname, content } = data;

                // 数据验证
                if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: '昵称不能为空'
                    }), {
                        status: 400,
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                        },
                    });
                }

                if (!content || typeof content !== 'string' || content.trim().length === 0) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: '留言内容不能为空'
                    }), {
                        status: 400,
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                        },
                    });
                }

                // 长度限制
                if (nickname.trim().length > 20) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: '昵称最多20个字符'
                    }), {
                        status: 400,
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                        },
                    });
                }

                if (content.trim().length > 500) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: '留言内容最多500个字符'
                    }), {
                        status: 400,
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                        },
                    });
                }

                // 插入到数据库（使用参数化查询防止 SQL 注入）
                const result = await env.DB.prepare(
                    'INSERT INTO comments (nickname, content) VALUES (?, ?)'
                ).bind(nickname.trim(), content.trim()).run();

                return new Response(JSON.stringify({
                    success: true,
                    message: '留言成功',
                    id: result.meta.last_row_id
                }), {
                    status: 201,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                });
            } catch (error) {
                return new Response(JSON.stringify({
                    success: false,
                    error: '提交留言失败'
                }), {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                    },
                });
            }
        }

        // 404 for other routes
        return new Response(JSON.stringify({
            success: false,
            error: 'Not Found'
        }), {
            status: 404,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
            },
        });
    },
};
