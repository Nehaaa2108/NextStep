
import type { StudentProfile } from '../types';
import { User, BookOpen, GraduationCap, MapPin } from 'lucide-react';

interface Props {
  profile: StudentProfile;
}

export const ProfilePanel: React.FC<Props> = ({ profile }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
        <div className="bg-blue-100 p-3 rounded-full text-blue-600">
          <User size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
          <p className="text-sm text-gray-500">Student Profile</p>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <BookOpen size={16} className="text-gray-400" />
          <span>{profile.degree}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <GraduationCap size={16} className="text-gray-400" />
          <span>Year {profile.year}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <MapPin size={16} className="text-gray-400" />
          <span>Prefers {profile.remotePreference}</span>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">My Skills</h3>
        <div className="flex flex-wrap gap-2">
          {profile.skills.map((skill) => (
            <span key={skill} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-md">
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
