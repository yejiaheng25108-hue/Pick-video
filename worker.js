/**
 * Cloudflare Workers API for Pick Video Comment System
 * Handles GET and POST requests for comments stored in D1 database
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS headers - 只允许您的域名访问
        const allowedOrigins = [
            'https://pick-video.pages.dev',     // Cloudflare 自动生成的域名
            'https://pick.monstervid.fun',      // 您自定义绑定的域名
            'http://localhost:3000',            // 本地开发
            'http://127.0.0.1:3000',            // 本地开发
            'http://localhost:5500',            // Live Server
            'http://127.0.0.1:5500'             // Live Server
        ];

        const origin = request.headers.get('Origin');
        const corsHeaders = {
            'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
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
                // 速率限制：每个 IP 每小时最多提交 10 次
                const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
                const rateLimitKey = `ratelimit:${clientIP}`;

                // 如果您配置了 KV namespace，取消下面的注释启用速率限制
                /*
                if (env.RATE_LIMIT) {
                    const attempts = await env.RATE_LIMIT.get(rateLimitKey);
                    const count = attempts ? parseInt(attempts) : 0;
                    
                    if (count >= 10) {
                        return new Response(JSON.stringify({
                            success: false,
                            error: '提交过于频繁，请稍后再试'
                        }), {
                            status: 429, // Too Many Requests
                            headers: {
                                ...corsHeaders,
                                'Content-Type': 'application/json',
                            },
                        });
                    }
                    
                    // 更新计数，1小时后过期
                    await env.RATE_LIMIT.put(rateLimitKey, (count + 1).toString(), { expirationTtl: 3600 });
                }
                */

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

                // 内容过滤：防止垃圾信息
                const spamKeywords = ['广告', '加微信', 'VX', '赌博', '彩票', 'http://', 'https://'];
                const lowerContent = content.toLowerCase();
                const hasSpam = spamKeywords.some(keyword => lowerContent.includes(keyword.toLowerCase()));

                if (hasSpam) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: '留言内容包含敏感词，请修改后重试'
                    }), {
                        status: 400,
                        headers: {
                            ...corsHeaders,
                            'Content-Type': 'application/json',
                        },
                    });
                }

                // 防止重复字符刷屏（如"啊啊啊啊啊啊啊啊啊啊"）
                const hasRepetition = /(.)\1{9,}/.test(content);
                if (hasRepetition) {
                    return new Response(JSON.stringify({
                        success: false,
                        error: '请勿重复输入相同字符'
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
