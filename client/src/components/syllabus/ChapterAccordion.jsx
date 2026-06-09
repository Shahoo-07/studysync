import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subjectsService } from '../../services/subjects.service';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import TopicRow from './TopicRow';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function ChapterAccordion({ chapterId, name }) {
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

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 py-2 hover:text-brown transition-colors"
      >
        {expanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
        <span className="font-medium text-brown">{name}</span>
      </button>

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
