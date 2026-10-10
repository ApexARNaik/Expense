import prisma from '@/lib/db'
import { requireMember } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'

export default async function ActivityPage() {
  const currentMember = await requireMember()
  if (!currentMember || currentMember.name !== 'Atul') {
    redirect('/')
  }

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      member: true
    }
  })

  return (
    <main className="p-4 pt-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6 px-2">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              &larr; Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Activity Logs (Admin)</h1>
          </div>
          <ThemeToggle />
        </header>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="space-y-4">
            {logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No activities found.</p>
            ) : (
              logs.map((log) => {
                let detailsObj: any = {}
                try {
                  detailsObj = log.details ? JSON.parse(log.details) : {}
                } catch (e) {
                  detailsObj = { text: log.details }
                }

                return (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: log.member.color }}
                        />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {log.member.name}
                        </span>
                        <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {log.action}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {detailsObj.title && <span className="font-medium">"{detailsObj.title}"</span>}
                        {detailsObj.amountPaise !== undefined && (
                          <span className="ml-2 text-gray-500">
                            (₹{(detailsObj.amountPaise / 100).toFixed(2)})
                          </span>
                        )}
                        {!detailsObj.title && detailsObj.text && <span>{detailsObj.text}</span>}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-0 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
