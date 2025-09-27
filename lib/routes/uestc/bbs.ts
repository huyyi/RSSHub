import { Route } from '@/types';
import ofetch from '@/utils/ofetch'; // 统一使用的请求库
import { parseDate } from '@/utils/parse-date'; // 解析日期的工具函数
import timezone from '@/utils/timezone';
import { config } from '@/config';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/bbs/:types?',
    name: '清水河畔',
    maintainers: ['huyyi'],
    categories: ['university'],
    url: 'bbs.uestc.edu.cn',
    example: '/uestc/bbs/newthread',
    parameters: { types: '选择内容类型(多选`,`分割），可选值：[newreply,newthread,digest,life,hotlist]。默认为所有。' },
    features: {
        requireConfig: [
            {
                name: 'UESTC_BBS_TOKEN',
                optional: true,
                description: '（可选）河畔的Token，不设置仅能查看部分分区内容',
            },
            {
                name: 'UESTC_BBS_SECRET',
                optional: true,
                description: '（可选）河畔验证的Secret，不设置仅能查看部分分区内容',
            },
        ],
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    description: `
::: tip
仅支持自建，您需要设置以下配置才能正常使用：
-   河畔cookie: \`UESTC_BBS_COOKIE\`
-   Header中的授权字段: \`UESTC_BBS_AUTH_KEY\`
:::tip
若不设置相应参数仅能获取部分分区的内容
:::
`,
    radar: [
        {
            source: ['bbs.uestc.edu.cn/*'],
            target: '/bbs/newthread',
        },
    ],
    handler: async () => {
        const { bbs_token, bbs_secret } = config.uestc;
        const apiUrl = 'https://bbs.uestc.edu.cn/mobcent/app/web/index.php';
        const topicListParams = {
            r: 'forum/topiclist',
            isImageList: 1,
            page: 1,
            pageSize: 25,
            sortby: 'new',
            accessToken: bbs_token,
            accessSecret: bbs_secret,
        };
        const dataRaw = await ofetch(apiUrl, {
            method: 'POST',
            params: topicListParams,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
        });
        const itemsRaw = dataRaw.list;
        const items = await Promise.all(
            itemsRaw.map((item) =>
                cache.tryGet(`uestc-bbs-${item.topic_id}`, async () => {
                    const detailData = await ofetch(apiUrl, {
                        method: 'POST',
                        params: {
                            r: 'forum/postlist',
                            topicId: item.topic_id,
                            page: 1,
                            pageSize: 10,
                            accessToken: bbs_token,
                            accessSecret: bbs_secret,
                        },
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                        },
                    });
                    // concat all contents
                    const allContents = detailData.topic.content
                        .map((post) => {
                            switch (post.type) {
                                // image
                                case '1':
                                    return `<img src="${post.infor}" alt="image"/>`;
                                case '4':
                                    return `<a href="${post.url}">${post.infor}</a>`;
                                default:
                                    return post.infor;
                            }
                        })
                        .join('\n\n');
                    return {
                        title: item.title,
                        link: `https://bbs.uestc.edu.cn/thread/${item.topic_id}`,
                        author: item.user_nick_name,
                        category: item.board_name,
                        image: item.pic_path,
                        description: allContents || item.subject,
                        pubDate: timezone(parseDate(item.last_reply_date, 'x'), +8),
                        upvotes: item.hits,
                        comments: item.replies,
                    };
                })
            )
        );
        return {
            // 源标题
            title: '清水河畔',
            // 源链接
            link: 'https://bbs.uestc.edu.cn/new',
            logo: 'https://bbs.uestc.edu.cn/assets/title-D_XPi883.ico',
            icon: 'https://bbs.uestc.edu.cn/assets/title-D_XPi883.ico',
            // 源文章
            item: items,
            language: 'zh-CN',
        };
    },
};
