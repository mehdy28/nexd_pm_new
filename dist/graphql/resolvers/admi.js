// graphql/resolvers/admin.ts
import { GraphQLError } from "graphql";
import { subDays, startOfDay, format, subYears, parseISO, eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, getQuarter, startOfQuarter, startOfMonth, isValid, } from "date-fns";
import { prisma } from "../../lib/prisma.js";
// ... (Helper functions like calculatePercentageChange, getPlanPrice remain the same) ...
const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
        return { change: current > 0 ? "+100%" : "+0%", trend: "up" };
    }
    const change = ((current - previous) / previous) * 100;
    const trend = change >= 0 ? "up" : "down";
    const changeString = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    return { change: changeString, trend };
};
const getPlanPrice = (plan) => {
    switch (plan) {
        case "PRO": return 25;
        case "ENTERPRISE": return 100;
        case "FREE":
        default: return 0;
    }
};
const getDatesFromChartInput = (input) => {
    const now = new Date();
    let startDate, endDate;
    if (input.range?.from && input.range.to) {
        startDate = startOfDay(parseISO(input.range.from));
        endDate = startOfDay(parseISO(input.range.to));
    }
    else {
        endDate = now;
        switch (input.preset) {
            case "7d":
                startDate = startOfDay(subDays(now, 7));
                break;
            case "90d":
                startDate = startOfDay(subDays(now, 90));
                break;
            case "1y":
                startDate = startOfDay(subYears(now, 1));
                break;
            case "all":
                startDate = new Date("2020-01-01");
                break;
            case "30d":
            default:
                startDate = startOfDay(subDays(now, 30));
                break;
        }
    }
    if (!isValid(startDate) || !isValid(endDate)) {
        throw new GraphQLError("Invalid date range provided.");
    }
    return { startDate, endDate };
};
export const adminResolvers = {
    Query: {
        adminGetDashboardPageData: async (_, __, context) => {
            if (!context.user || context.user.role !== "ADMIN") {
                throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
            }
            const now = new Date();
            const startDate = startOfDay(subDays(now, 30));
            const [totalUserCount, prevUserCount, totalWorkspaceCount, prevWorkspaceCount, totalProjectCount, prevProjectCount, totalTaskCount, prevTaskCount, totalDocumentCount, prevDocumentCount, totalWhiteboardCount, prevWhiteboardCount, activeSubscriptions, recentActivities, subscriptionDistribution, topWorkspaceActivity,] = await Promise.all([
                prisma.user.count(),
                prisma.user.count({ where: { createdAt: { lt: startDate } } }),
                prisma.workspace.count(),
                prisma.workspace.count({ where: { createdAt: { lt: startDate } } }),
                prisma.project.count(),
                prisma.project.count({ where: { createdAt: { lt: startDate } } }),
                prisma.task.count(),
                prisma.task.count({ where: { createdAt: { lt: startDate } } }),
                prisma.document.count(),
                prisma.document.count({ where: { createdAt: { lt: startDate } } }),
                prisma.whiteboard.count(),
                prisma.whiteboard.count({ where: { createdAt: { lt: startDate } } }),
                prisma.subscription.findMany({ where: { status: "ACTIVE" } }),
                prisma.auditLog.findMany({ take: 7, orderBy: { createdAt: "desc" }, include: { user: true } }),
                prisma.subscription.groupBy({ by: ["plan"], _count: { plan: true }, where: { status: "ACTIVE" } }),
                prisma.auditLog.groupBy({ by: ["workspaceId"], _count: { id: true }, where: { createdAt: { gte: startDate } }, orderBy: { _count: { id: "desc" } }, take: 10 }),
            ]);
            const mrr = activeSubscriptions.reduce((acc, sub) => acc + getPlanPrice(sub.plan), 0);
            const prevMrr = mrr / 1.08;
            const churn = 2.3;
            const prevChurn = 2.8;
            const kpis = {
                totalUsers: { value: totalUserCount.toLocaleString(), ...calculatePercentageChange(totalUserCount, prevUserCount) },
                activeWorkspaces: { value: totalWorkspaceCount.toLocaleString(), ...calculatePercentageChange(totalWorkspaceCount, prevWorkspaceCount) },
                totalProjects: { value: totalProjectCount.toLocaleString(), ...calculatePercentageChange(totalProjectCount, prevProjectCount) },
                tasksCreated: { value: totalTaskCount.toLocaleString(), ...calculatePercentageChange(totalTaskCount, prevTaskCount) },
                documents: { value: totalDocumentCount.toLocaleString(), ...calculatePercentageChange(totalDocumentCount, prevDocumentCount) },
                Whiteboards: { value: totalWhiteboardCount.toLocaleString(), ...calculatePercentageChange(totalWhiteboardCount, prevWhiteboardCount) },
                monthlyRevenue: { value: `$${mrr.toLocaleString()}`, ...calculatePercentageChange(mrr, prevMrr) },
                churnRate: { value: `${churn}%`, ...calculatePercentageChange(churn, prevChurn) },
            };
            // Other processing for static data...
            const formattedSubDistribution = subscriptionDistribution.map(group => ({ name: group.plan, value: group._count.plan }));
            const revenueByPlan = subscriptionDistribution.map(group => ({ name: group.plan, value: group._count.plan * getPlanPrice(group.plan) }));
            const workspaceIds = topWorkspaceActivity.map(w => w.workspaceId);
            const workspaceDetails = await prisma.workspace.findMany({ where: { id: { in: workspaceIds } }, select: { id: true, name: true } });
            const workspaceMap = new Map(workspaceDetails.map(w => [w.id, w.name]));
            const topWorkspaces = topWorkspaceActivity.map(activity => ({ id: activity.workspaceId, name: workspaceMap.get(activity.workspaceId) || "Unknown", activityCount: activity._count.id }));
            // Mocked data for simplicity
            const mrrGrowth = Array.from({ length: 30 }, (_, i) => ({ date: format(subDays(now, 29 - i), "MMM d"), value: 0 }));
            const churnRateData = Array.from({ length: 30 }, (_, i) => ({ date: format(subDays(now, 29 - i), "MMM d"), value: 2 + Math.sin(i * 0.5) * 0.5 }));
            const featureAdoption = [{ name: "Whiteboards", value: 45 }, { name: "Prompts", value: 25 }, { name: "Gantt Charts", value: 60 }, { name: "Documents", value: 85 }];
            return {
                kpis,
                mrrGrowth,
                churnRate: churnRateData,
                subscriptionDistribution: formattedSubDistribution,
                revenueByPlan,
                featureAdoption,
                topWorkspaces,
                recentActivities: recentActivities.map(activity => ({ ...activity, data: activity.data, user: activity.user })),
            };
        },
        adminGetDashboardChartData: async (_, { input }, context) => {
            if (!context.user || context.user.role !== "ADMIN") {
                throw new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN" } });
            }
            const { startDate, endDate } = getDatesFromChartInput(input);
            const [allUsers, allProjects, allTasks, allDocuments, allWhiteboards] = await Promise.all([
                prisma.user.findMany({ where: { createdAt: { gte: startDate, lte: endDate } } }),
                prisma.project.findMany({ where: { createdAt: { gte: startDate, lte: endDate } } }),
                prisma.task.findMany({ where: { createdAt: { gte: startDate, lte: endDate } } }),
                prisma.document.findMany({ where: { createdAt: { gte: startDate, lte: endDate } } }),
                prisma.whiteboard.findMany({ where: { createdAt: { gte: startDate, lte: endDate } } }),
            ]);
            const timeSeries = {};
            const interval = { start: startDate, end: endDate };
            let datePoints = [];
            let formatKey = () => "";
            switch (input.granularity) {
                case "quarterly":
                    datePoints = eachQuarterOfInterval(interval);
                    formatKey = date => `${format(date, "yyyy")} Q${getQuarter(date)}`;
                    break;
                case "monthly":
                    datePoints = eachMonthOfInterval(interval);
                    formatKey = date => format(date, "MMM yyyy");
                    break;
                case "daily":
                default:
                    datePoints = eachDayOfInterval(interval);
                    formatKey = date => format(date, "MMM d");
                    break;
            }
            datePoints.forEach(date => {
                timeSeries[formatKey(date)] = { users: 0, projects: 0, tasks: 0, documents: 0, Whiteboards: 0 };
            });
            const aggregate = (records, key) => {
                records.forEach(r => {
                    let dateKey;
                    switch (input.granularity) {
                        case "quarterly":
                            dateKey = formatKey(startOfQuarter(r.createdAt));
                            break;
                        case "monthly":
                            dateKey = formatKey(startOfMonth(r.createdAt));
                            break;
                        default:
                            dateKey = formatKey(r.createdAt);
                            break;
                    }
                    if (timeSeries[dateKey])
                        timeSeries[dateKey][key]++;
                });
            };
            aggregate(allUsers, "users");
            aggregate(allProjects, "projects");
            aggregate(allTasks, "tasks");
            aggregate(allDocuments, "documents");
            aggregate(allWhiteboards, "Whiteboards");
            const chartData = Object.entries(timeSeries).map(([date, values]) => ({ date, ...values }));
            const userGrowth = chartData.map(d => ({ date: d.date, users: d.users, projects: d.projects, tasks: d.tasks }));
            const contentCreation = chartData.map(d => ({ date: d.date, documents: d.documents, Whiteboards: d.Whiteboards, tasks: d.tasks }));
            return { userGrowth, contentCreation };
        },
    },
};
