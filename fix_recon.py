import re

with open(r'C:\Users\86136\Desktop\Overtime_Hours_Accounting\加班工时记账\pages\reconciliation\recon.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add settlement fields to group init
old_init = "\t\t\t\t\t\tisHourly: true,\n\t\t\t\t\t\trecords: []"
new_init = "\t\t\t\t\t\tisHourly: true,\n\t\t\t\t\t\trecords: [],\n\t\t\t\t\t\tsettledQty: '',\n\t\t\t\t\t\tunsettledQty: ''"
content = content.replace(old_init, new_init)

# 2. Track settled count
old_track = "if (r.pay_mode && r.pay_mode !== 'hourly') g.isHourly = false"
new_track = "if (r.pay_mode && r.pay_mode !== 'hourly') g.isHourly = false\n\t\t\t\t\tif (r.settled) g.settledCount = (g.settledCount || 0) + 1\n\t\t\t\t\telse g.unsettledCount = (g.unsettledCount || 0) + 1"
content = content.replace(old_track, new_track)

# 3. After rate computation, add allSettled check
old_return = "return Object.values(groups)"
new_return = "\t\t\tObject.values(groups).forEach(g => { g.allSettled = g.records.length > 0 && g.records.every(r => r.settled) })\n\t\t\treturn Object.values(groups)"
content = content.replace(old_return, new_return)

# 4. Add settlement qty for daily mode
old_daily = "g.subtotalQty = g.subtotalDays + '天'\n\t\t\t\t\t} else if (mode === 'piece')"
new_daily = """g.subtotalQty = g.subtotalDays + '天'
						const sd = g.records.filter(r => r.settled).reduce((s,r) => s+(r.days||0), 0)
						const ud = g.records.filter(r => !r.settled).reduce((s,r) => s+(r.days||0), 0)
						g.settledQty = sd > 0 ? sd + '天' : ''
						g.unsettledQty = ud > 0 ? ud + '天' : ''
					} else if (mode === 'piece')"""
content = content.replace(old_daily, new_daily)

# 5. Add settlement qty for piece mode
old_piece = "g.subtotalQty = g.subtotalQty + (proj?.piece_unit || g.records[0]?.piece_unit || '件')\n\t\t\t\t\t} else"
new_piece = """g.subtotalQty = g.subtotalQty + (proj?.piece_unit || g.records[0]?.piece_unit || '件')
						const sq = g.records.filter(r => r.settled).reduce((s,r) => s+(r.quantity||0), 0)
						const uq = g.records.filter(r => !r.settled).reduce((s,r) => s+(r.quantity||0), 0)
						const pu = proj?.piece_unit || g.records[0]?.piece_unit || '件'
						g.settledQty = sq > 0 ? sq + pu : ''
						g.unsettledQty = uq > 0 ? uq + pu : ''
					} else"""
content = content.replace(old_piece, new_piece)

# 6. Add settlement qty for hourly mode
old_hourly = "g.subtotalQty = g.subtotalHours + 'h'\n\t\t\t\t\t}\n\t\t\t\t})"
new_hourly = """g.subtotalQty = g.subtotalHours + 'h'
						const sh = g.records.filter(r => r.settled).reduce((s,r) => s+(r.duration||0), 0)
						const uh = g.records.filter(r => !r.settled).reduce((s,r) => s+(r.duration||0), 0)
						g.settledQty = sh > 0 ? sh + 'h' : ''
						g.unsettledQty = uh > 0 ? uh + 'h' : ''
					}
				})"""
content = content.replace(old_hourly, new_hourly)

# 7. Add handleSettlementToggle method before handleCopy
old_handleCopy = "\t\thandleCopy() {"
new_handleCopy = """\t\tasync handleSettlementToggle(group) {
\t\t\tconst allSettled = group.records.every(r => r.settled)
\t\t\tconst newSettled = !allSettled
\t\t\tuni.showActionSheet({
\t\t\t\titemList: [newSettled ? '全部标记已结算' : '全部标记未结算'],
\t\t\t\tsuccess: async (res) => {
\t\t\t\t\tif (res.tapIndex === 0) {
\t\t\t\t\t\tconst store = useOvertimeStore()
\t\t\t\t\t\tfor (const rec of group.records) {
\t\t\t\t\t\t\tawait store.updateRecord(rec.id || rec._id, { settled: newSettled })
\t\t\t\t\t\t}
\t\t\t\t\t\tuni.showToast({ title: newSettled ? '已标记结算' : '已取消结算', icon: 'success' })
\t\t\t\t\t\tstore.loadRecords()
\t\t\t\t\t}
\t\t\t\t}
\t\t\t})
\t\t},
\t\thandleCopy() {"""
content = content.replace(old_handleCopy, new_handleCopy)

with open(r'C:\Users\86136\Desktop\Overtime_Hours_Accounting\加班工时记账\pages\reconciliation\recon.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')
