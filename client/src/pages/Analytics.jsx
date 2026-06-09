import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsService } from '../services/analytics.service';
import { subjectsService } from '../services/subjects.service';
import Navbar from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts';
import { Flame, Calendar, AlertTriangle, TrendingUp, Clock, Plus, X } from 'lucide-react';
import { format, subDays, isSameDay, parseISO } from 'date-fns';

export default function Analytics() {
  const queryClient = useQueryClient();
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [duration, setDuration] = useState(30);

  // Fetch streak
  const { data: streak } = useQuery({
    queryKey: ['analytics', 'streak'],
    queryFn: () => analyticsService.getStreak().then((r) => r.data),
  });

  // Fetch heatmap (last 90 days)
  const { data: heatmap = {} } = useQuery({
    queryKey: ['analytics', 'heatmap'],
    queryFn: () => analyticsService.getHeatmap(90).then((r) => r.data),
  });

  // Fetch weak areas
  const { data: weakAreas = [] } = useQuery({
    queryKey: ['analytics', 'weakAreas'],
    queryFn: () => analyticsService.getWeakAreas().then((r) => r.data),
  });

  // Fetch all subjects (for logging sessions and rendering pace)
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsService.getSubjects().then((r) => r.data),
  });

  // Fetch topics for selected subject when logging a session
  const { data: topics = [] } = useQuery({
    queryKey: ['topics-list', selectedSubjectId],
    queryFn: async () => {
      if (!selectedSubjectId) return [];
      // To get topics, we need to fetch chapters first, then topics for each chapter
      const chaptersRes = await subjectsService.getChapters(selectedSubjectId);
      const chapters = chaptersRes.data;
      const allTopics = [];
      for (const ch of chapters) {
        const topicsRes = await subjectsService.getTopics(ch.id);
        allTopics.push(...topicsRes.data.map(t => ({ ...t, chapterName: ch.name })));
      }
      return allTopics;
    },
    enabled: !!selectedSubjectId,
  });

  // Log session mutation
  const logSessionMutation = useMutation({
    mutationFn: (data) =>
      analyticsService.logSession(data.topicId, data.subjectId, data.duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setShowLogModal(false);
      setSelectedSubjectId('');
      setSelectedTopicId('');
      setDuration(30);
    },
  });

  const handleLogSession = (e) => {
    e.preventDefault();
    if (!selectedSubjectId || !duration) return;
    logSessionMutation.mutate({
      subjectId: selectedSubjectId,
      topicId: selectedTopicId || null,
      duration: parseInt(duration),
    });
  };

  // Generate 90 days list for heatmap
  const heatmapDays = [];
  for (let i = 89; i >= 0; i--) {
    heatmapDays.push(subDays(new Date(), i));
  }

  // Generate last 14 days for Recharts daily progress
  const chartData = [];
  for (let i = 13; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const sessionCount = heatmap[dateStr] || 0;
    chartData.push({
      dateLabel: format(date, 'MMM dd'),
      sessions: sessionCount,
    });
  }

  return (
    <div className="min-h-screen bg-cream-50 text-brown-text font-sans">
      <Navbar />

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-serif font-bold text-brown mb-2">
              Your Analytics
            </h1>
            <p className="text-brown-dark">
              Track your study streaks, daily progress, and recommendations
            </p>
          </div>
          <Button onClick={() => setShowLogModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Log Study Session
          </Button>
        </div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Streak Card */}
          <div className="card flex flex-col justify-between border border-tan bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-semibold text-brown-dark tracking-wider">
                  Consistency
                </span>
                <h2 className="text-2xl font-serif font-bold text-brown mt-1">
                  Study Streak
                </h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center text-brown">
                <Flame className="w-6 h-6 fill-current text-brown" />
              </div>
            </div>
            <div className="my-6">
              <span className="text-5xl font-bold font-serif text-brown">
                {streak?.currentStreak || 0}
              </span>
              <span className="text-lg font-medium text-brown-dark ml-2">days</span>
            </div>
            <p className="text-sm text-brown-dark">
              {streak?.lastActiveDate
                ? `Last study session logged: ${format(parseISO(streak.lastActiveDate), 'MMM dd, yyyy')}`
                : 'No sessions logged yet. Start studying today!'}
            </p>
          </div>

          {/* Heatmap Card */}
          <div className="card md:col-span-2 border border-tan bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-brown-dark tracking-wider">
                90-Day History
              </span>
              <h2 className="text-2xl font-serif font-bold text-brown mt-1 mb-4">
                Activity Heatmap
              </h2>
            </div>
            
            <div className="overflow-x-auto pb-2">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
                {heatmapDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const count = heatmap[dateStr] || 0;
                  
                  // Color scale based on session count
                  let colorClass = 'bg-cream-100 border border-cream-200';
                  if (count === 1) colorClass = 'bg-tan hover:bg-tan-dark';
                  else if (count === 2) colorClass = 'bg-brown/50 hover:bg-brown/60';
                  else if (count >= 3) colorClass = 'bg-brown hover:bg-brown-dark';

                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-sm transition-colors cursor-pointer ${colorClass}`}
                      title={`${format(day, 'MMM dd, yyyy')}: ${count} study session${count !== 1 ? 's' : ''}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 text-xs text-brown-dark">
              <span>90 days ago</span>
              <div className="flex items-center gap-1.5">
                <span>Less</span>
                <div className="w-3 h-3 bg-cream-100 border border-cream-200 rounded-sm" />
                <div className="w-3 h-3 bg-tan rounded-sm" />
                <div className="w-3 h-3 bg-brown/50 rounded-sm" />
                <div className="w-3 h-3 bg-brown rounded-sm" />
                <span>More</span>
              </div>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Charts & Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Daily Progress Chart */}
          <div className="card border border-tan bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-serif font-bold text-brown mb-1">
              Daily Progress
            </h2>
            <p className="text-sm text-brown-dark mb-6">
              Number of study sessions completed over the last 14 days
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="dateLabel" tick={{ fill: '#8B6E52', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#8B6E52', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ChartTooltip 
                    contentStyle={{ backgroundColor: '#FAFAF7', borderColor: '#E8DDD0', borderRadius: '8px' }}
                    labelStyle={{ fontWeight: 'bold', color: '#2C1F14' }}
                  />
                  <Bar dataKey="sessions" fill="#8B6E52" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weak areas list */}
          <div className="card border border-tan bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-serif font-bold text-brown mb-1">
                Areas Needing Attention
              </h2>
              <p className="text-sm text-brown-dark mb-6">
                Topics that have been "In Progress" for more than 3 days
              </p>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[200px] space-y-3 pr-2">
              {weakAreas.length > 0 ? (
                weakAreas.map((area) => (
                  <div
                    key={area.id}
                    className="flex items-start gap-3 p-3 bg-cream-50 rounded-lg border border-tan"
                  >
                    <AlertTriangle className="w-5 h-5 text-brown mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-brown-text text-sm">
                        {area.name}
                      </h4>
                      <p className="text-xs text-brown-dark">
                        {area.subjectName} &bull; {area.chapterName}
                      </p>
                      <p className="text-[10px] text-brown/80 mt-1">
                        Stuck in progress since {format(parseISO(area.created_at), 'MMM dd')} ({area.sessionCount || 0} study sessions logged)
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-6">
                  <span className="text-3xl mb-2">🎉</span>
                  <p className="text-sm font-semibold text-brown">No weak areas identified!</p>
                  <p className="text-xs text-brown-dark mt-1">You are maintaining a great study pace.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pace Calculations per Subject */}
        <div>
          <h2 className="text-3xl font-serif font-bold text-brown mb-2">
            Recommended Pace
          </h2>
          <p className="text-brown-dark mb-6">
            Pace requirements calculated to help you complete your syllabus before exam dates
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.filter(s => s.exam_date).length > 0 ? (
              subjects.filter(s => s.exam_date).map((subject) => (
                <SubjectPaceCard key={subject.id} subject={subject} />
              ))
            ) : (
              <div className="card col-span-2 text-center py-10 border border-dashed border-tan">
                <Calendar className="w-12 h-12 text-tan mx-auto mb-3" />
                <h4 className="text-lg font-serif font-bold text-brown mb-1">No Exam Dates Configured</h4>
                <p className="text-sm text-brown-dark max-w-md mx-auto">
                  Go to your Syllabus on the Home page, set exam dates for your subjects, and we will calculate your daily recommended study pace here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Study Session Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-cream-50 rounded-xl border border-tan shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowLogModal(false);
                setSelectedSubjectId('');
                setSelectedTopicId('');
              }}
              className="absolute right-4 top-4 text-brown-dark hover:text-brown transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-2xl font-serif font-bold text-brown mb-2">
              Log Study Session
            </h3>
            <p className="text-xs text-brown-dark mb-4">
              Add study hours to update your activity heatmap and streak.
            </p>

            <form onSubmit={handleLogSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-text mb-1">
                  Subject *
                </label>
                <select
                  required
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedTopicId('');
                  }}
                  className="w-full px-3 py-2 border border-tan rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brown text-sm"
                >
                  <option value="">Select a subject...</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSubjectId && (
                <div>
                  <label className="block text-sm font-medium text-brown-text mb-1">
                    Specific Topic (Optional)
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                    className="w-full px-3 py-2 border border-tan rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brown text-sm text-ellipsis overflow-hidden"
                  >
                    <option value="">Whole Subject / General Study</option>
                    {topics.map((top) => (
                      <option key={top.id} value={top.id}>
                        {top.chapterName} &rarr; {top.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-brown-text mb-1">
                  Study Duration (Minutes) *
                </label>
                <Input
                  type="number"
                  required
                  min={1}
                  max={480}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  {[15, 30, 45, 60, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDuration(mins)}
                      className={`text-xs px-2.5 py-1.5 rounded border ${
                        parseInt(duration) === mins
                          ? 'bg-brown text-white border-brown'
                          : 'bg-white text-brown-text border-tan hover:bg-cream-100'
                      } transition-colors`}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowLogModal(false);
                    setSelectedSubjectId('');
                    setSelectedTopicId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={logSessionMutation.isPending || !selectedSubjectId}
                >
                  {logSessionMutation.isPending ? 'Logging...' : 'Save Session'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for displaying individual subject pace calculations
function SubjectPaceCard({ subject }) {
  const { data: pace, isLoading, error } = useQuery({
    queryKey: ['analytics', 'pace', subject.id],
    queryFn: () => analyticsService.getPace(subject.id).then((r) => r.data),
    enabled: !!subject.id,
  });

  if (isLoading) {
    return (
      <div className="card border border-tan bg-white p-6 shadow-sm animate-pulse h-44" />
    );
  }

  if (error || !pace || pace.message) {
    return null; // Don't show card if there's no pace data or no exam set
  }

  const completionPercentage = pace.total > 0 ? Math.round((pace.completed / pace.total) * 100) : 0;

  return (
    <div className="card border border-tan bg-white p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Decorative colored corner representing the subject color */}
      <div 
        className="absolute top-0 right-0 w-24 h-24 transform translate-x-12 -translate-y-12 rotate-45 opacity-20"
        style={{ backgroundColor: subject.color || '#E8DDD0' }}
      />

      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3.5 h-3.5 rounded-full"
          style={{ backgroundColor: subject.color || '#E8DDD0' }}
        />
        <h3 className="text-xl font-serif font-bold text-brown truncate max-w-[80%]">
          {subject.name}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-brown-dark tracking-wider">Exam Date</span>
          <p className="text-sm font-semibold mt-0.5">
            {format(parseISO(pace.examDate), 'MMM dd, yyyy')}
          </p>
          <span className="text-[10px] text-brown-dark">
            {pace.daysUntilExam > 0 
              ? `${pace.daysUntilExam} days countdown` 
              : 'Exam date reached!'}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-brown-dark tracking-wider">Recommended Pace</span>
          <p className="text-lg font-bold text-brown flex items-center gap-1 mt-0.5">
            <TrendingUp className="w-4 h-4" />
            {pace.topicsPerDay} <span className="text-xs font-normal">topics/day</span>
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs font-medium text-brown-dark mb-1">
          <span>{pace.completed} / {pace.total} topics done</span>
          <span>{completionPercentage}%</span>
        </div>
        <div className="w-full bg-cream-100 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              backgroundColor: subject.color || '#8B6E52',
              width: `${completionPercentage}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
