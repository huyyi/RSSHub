import { Route } from '@/types';
import ofetch from '@/utils/ofetch'; // 统一使用的请求库
import { parseDate } from '@/utils/parse-date'; // 解析日期的工具函数
import timezone from '@/utils/timezone';
import { config } from '@/config';

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
        const { bbsToken, bbsSecret } = config.uestc;
        const authStr = bbsToken && bbsSecret ? `&accessToken=${bbsToken}&accessSecret=${bbsSecret}` : '';
        const dataRaw = await ofetch(`https://bbs.uestc.edu.cn/mobcent/app/web/index.php?r=forum%2Ftopiclist&isImageList=1&page=1&pageSize=25&sortby=new${authStr}`);
        const data = JSON.parse(dataRaw);
        const itemsRaw = data.list;
        const items = itemsRaw.map((item) => ({
                title: item.title,
                link: item.sourceWebUrl,
                author: item.user_nick_name,
                category: item.board_name,
                img: item.pic_path,
                pubDate: timezone(parseDate(item.last_reply_date), +8),
                description: item.subject,
            }));
        return {
            // 源标题
            title: '清水河畔',
            // 源链接
            link: 'https://bbs.uestc.edu.cn/new',
            // 源文章
            item: items,
            language: 'zh',
        };
    },
};
