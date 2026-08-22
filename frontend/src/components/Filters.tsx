import type { SearchCriteria } from '../types';

interface Props {
  criteria: SearchCriteria;
  onChange: (criteria: SearchCriteria) => void;
}

export const Filters = ({ criteria, onChange }: Props) => {
  const toggleType = (type: string) => {
    const currentTypes = criteria.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    onChange({ ...criteria, types: newTypes });
  };

  const handleReset = () => {
    onChange({ query: criteria.query, types: [] });
  };

  const types = ["internship", "hackathon", "competition", "scholarship"];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        <button 
          onClick={handleReset}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
          aria-label="Clear all filters"
        >
          Clear
        </button>
      </div>
      
      <div className="mb-4">
        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Opportunity Type</h4>
        <div className="space-y-2">
          {types.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={(criteria.types || []).includes(type)}
                onChange={() => toggleType(type)}
                aria-label={`Filter by ${type}`}
              />
              <span className="text-sm text-gray-700 capitalize">{type}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase">Location</h4>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={criteria.remote === true}
            onChange={(e) => onChange({ ...criteria, remote: e.target.checked ? true : undefined })}
            aria-label="Filter remote only"
          />
          <span className="text-sm text-gray-700">Remote Only</span>
        </label>
      </div>
    </div>
  );
};
