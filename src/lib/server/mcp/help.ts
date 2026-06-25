import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import { z } from 'zod';

export const tools: Tool[] = [
	{
		name: 'get_help',
		description:
			'使い方・機能説明を取得する。ユーザーが「使い方を教えて」「何ができる？」「ヘルプ」「〇〇機能の使い方は？」などと聞いた時に呼び出す。topic を省略すると全体概要を返す',
		input_schema: {
			type: 'object',
			properties: {
				topic: {
					type: 'string',
					enum: ['overview', 'approvals', 'reminders', 'documents', 'email'],
					description: '知りたいトピック（省略時は全体概要）'
				}
			}
		}
	}
];

const getHelpInputSchema = z.object({
	topic: z.enum(['overview', 'approvals', 'reminders', 'documents', 'email']).optional()
});

const HELP: Record<string, object> = {
	overview: {
		title: 'Teeling 使い方ガイド',
		description: 'AIと相談しながら申請書を作成・レビューし、承認者がすばやく判断できる申請管理システムです',
		features: [
			{ name: '申請作成・レビュー', topic: 'approvals', examples: ['出張費用の申請を作って', '承認待ちの申請は？', 'この申請のROIを計算して'] },
			{ name: 'リマインダー', topic: 'reminders', examples: ['明日の10時に申請期限をリマインドして'] },
			{ name: '資料生成（Word/Excel/PowerPoint）', topic: 'documents', examples: ['承認済み案件をExcelにまとめて'] },
			{ name: 'メール送信', topic: 'email', examples: ['申請者に結果を通知するメールを送って'] }
		],
		tips: [
			'自然な日本語で指示するだけでOKです',
			'申請内容に費用と予測売上があれば「ROIを計算して」と頼めます',
			'申請の承認・否決は申請詳細画面から行えます'
		],
		relatedPages: [
			{ label: '申請一覧', href: '/', description: '申請の確認・承認・否決ができます' },
			{ label: '設定', href: '/settings', description: 'アプリの各種設定を変更できます' }
		]
	},
	approvals: {
		title: '申請管理',
		description: 'AIが申請内容をレビューし、承認者に必要な判断材料（ROI・リスク等）を自動生成します',
		operations: [
			{ action: '申請を作成する', examples: ['出張費用10万円の申請を作って', '〇〇の承認申請を出したい'] },
			{ action: 'AIに申請内容をレビューしてもらう', examples: ['この申請の問題点を指摘して', '申請書の改善点を教えて'] },
			{ action: '判断材料を生成してもらう', examples: ['この申請のROIを計算して', '費用対効果を分析して', 'リスク評価をして'] },
			{ action: '申請一覧・状況を確認する', examples: ['承認待ちの申請は？', '今月の申請件数は？'] },
			{ action: '申請を承認・否決する', examples: ['〇〇の申請を承認して', '〇〇申請を却下して'] },
			{ action: '申請を取り消す', examples: ['〇〇の申請を取り消して'] }
		],
		tips: [
			'承認ルートは複数ステップ・並列承認に対応しています',
			'申請データに費用・予測売上・期間などを含めると判断材料の精度が上がります',
			'AIレビューは申請詳細画面からも実行できます'
		],
		relatedPages: [
			{ label: '申請一覧', href: '/', description: '申請の詳細確認・承認・否決操作ができます' }
		]
	},
	reminders: {
		title: 'リマインダー',
		description: '指定した日時に通知センター・メール・Slack（連携設定済みの場合）へ通知を送ります',
		operations: [
			{ action: 'リマインダーを設定する', examples: ['明日の10時に申請期限をリマインドして', '来週月曜に〇〇申請の締切を通知して'] }
		],
		tips: [
			'通知先はフォーム送信時に選択できます（通知センター・メール・Slack）',
			'Slack通知は外部API連携画面でWebhook URLの設定が必要です'
		],
		relatedPages: [
			{ label: '外部API連携', href: '/settings/integrations', description: 'Slack Webhook URLの設定ができます' }
		]
	},
	documents: {
		title: '資料生成（Word / Excel / PowerPoint）',
		operations: [
			{ action: 'Word文書を作成する', description: '承認報告書・申請書類など', examples: ['今月の承認済み申請をWordでまとめて'] },
			{ action: 'Excelブックを作成する', description: '申請一覧・集計表など', examples: ['承認待ち申請の一覧をExcelに出力して'] },
			{ action: 'PowerPointスライドを作成する', description: '会議用資料など', examples: ['今月の申請件数・承認率をスライドにまとめて'] }
		],
		tips: [
			'生成完了後、自動的にダウンロードリンクが表示されます'
		]
	},
	email: {
		title: 'メール送信',
		operations: [
			{ action: 'メールを作成・送信する', examples: ['申請者に結果を通知するメールを送って', '承認担当者にリマインドメールを書いて'] }
		],
		tips: [
			'AIが下書きを作成し、フォームで内容を確認・編集してから送信します',
			'初回利用時はメール設定画面でメールサービスの設定が必要です'
		],
		relatedPages: [
			{ label: 'メール設定', href: '/settings/email', description: 'メール送信サービスの設定ができます' }
		]
	}
};

export function handleGetHelp(input: unknown) {
	const { topic } = getHelpInputSchema.parse(input ?? {});
	return HELP[topic ?? 'overview'];
}
