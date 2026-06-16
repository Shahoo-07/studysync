import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsService } from '../../services/subjects.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import TopicRow from './TopicRow';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function ChapterAccordion({ chapterId, name, status, subjectId }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [showNewTopic, setShowNewTopic] = useState(false);

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', chapterId],
    queryFn: async () => {
      const response = await subjectsService.getTopics(chapterId);
      return response.data;
    },
    enabled: expanded,
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus) => subjectsService.updateChapter(chapterId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chapters', subjectId] });
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: (topicName) => subjectsService.createTopic(chapterId, topicName),
    onSuccess: () => {
      setNewTopicName('');
      setShowNewTopic(false);
      queryClient.invalidateQueries({ queryKey: ['topics', chapterId] });
    },
  });

  const handleCreateTopic = () => {
    if (newTopicName.trim()) {
      createTopicMutation.mutate(newTopicName);
    }
  };

  const statusOptions = [
    { value: 'not_started', label: 'Not Started', icon: '⭕' },
    { value: 'in_progress', label: 'In Progress', icon: '⏳' },
    { value: 'done', label: 'Done', icon: '✅' },
    { value: 'revision_needed', label: 'Revision Needed', icon: '🔄' },
  ];

  const currentStatus = statusOptions.find((s) => s.value === status) || statusOptions[0];

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 hover:text-brown transition-colors text-left"
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <span className="font-medium text-brown">{name}</span>
        </button>

        {/* Chapter Status Dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] border border-tan rounded bg-white hover:bg-cream-50 transition-colors text-brown-text font-medium focus:outline-none">
            <span>{currentStatus.icon}</span>
            <span>{currentStatus.label}</span>
          </button>
          <div className="absolute left-0 top-full mt-1 w-32 bg-white border border-tan rounded shadow-lg hidden group-hover:block z-20">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => statusMutation.mutate(option.value)}
                className="w-full text-left px-2.5 py-1 text-[10px] text-brown-text hover:bg-cream-100 flex items-center gap-1.5 first:rounded-t last:rounded-b"
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 pl-6">
          {!showNewTopic ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNewTopic(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Topic
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="Topic name"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleCreateTopic}
                disabled={createTopicMutation.isPending}
              >
                Add
              </Button>
            </div>
          )}

          {topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topicId={topic.id}
              name={topic.name}
              status={topic.status}
              chapterId={chapterId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
