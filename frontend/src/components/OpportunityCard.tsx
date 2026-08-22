import type { Opportunity } from '../types';
import { ExternalLink, MapPin, Calendar, Briefcase, Globe } from 'lucide-react';

interface Props {
  opportunity: Opportunity;
}

export const OpportunityCard = ({ opportunity }: Props) => {
  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{opportunity.title}</h3>
          <p className="text-gray-600 font-medium">
            {opportunity.organization || 'Organization Unknown'}
          </p>
        </div>
        <div className="flex flex-col items-end">
          {opportunity.matchScore !== undefined ? (
            <div className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full mb-2">
              {opportunity.matchScore}% Match
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-1 rounded-full mb-2" title="Match score unavailable">
              Score Pending
            </div>
          )}
          {opportunity.source && (
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded capitalize font-medium flex items-center gap-1">
              <Globe size={12} /> {opportunity.source}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Briefcase size={16} />
          <span className="capitalize">{opportunity.type || 'Opportunity'}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin size={16} />
          <span>{opportunity.remote ? 'Remote' : (opportunity.location || 'Location varies')}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={16} />
          <span>{opportunity.deadline ? `Due: ${new Date(opportunity.deadline).toLocaleDateString()}` : 'Ongoing / No deadline'}</span>
        </div>
      </div>

      {(opportunity.description || opportunity.matchReason) && (
        <div className="mt-4">
          {opportunity.matchReason && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800 mb-3">
              <span className="font-semibold block mb-1">Why this matches you:</span>
              {opportunity.matchReason}
            </div>
          )}
          {opportunity.description && (
            <p className="text-sm text-gray-700 line-clamp-2">{opportunity.description}</p>
          )}
        </div>
      )}

      {opportunity.skills && opportunity.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {opportunity.skills.map((skill) => (
            <span key={skill} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-md">
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
        <a
          href={opportunity.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View source for ${opportunity.title}`}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          onClick={(e) => {
            if (!opportunity.url) e.preventDefault();
          }}
        >
          View Source <ExternalLink size={16} />
        </a>
      </div>
    </article>
  );
};
