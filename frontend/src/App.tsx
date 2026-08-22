import { useState, useEffect } from 'react';
import { OpportunityCard } from './components/OpportunityCard';
import { ProfilePanel } from './components/ProfilePanel';
import { Filters } from './components/Filters';
import { searchOpportunities } from './services/api';
import { mockProfile } from './data/mockData';
import type { Opportunity, SearchCriteria } from './types';
import { Search, Radar, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

function App() {
  const [query, setQuery] = useState('');
  const [criteria, setCriteria] = useState<SearchCriteria>({ types: [] });
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (loading) return; // Disable duplicate submissions
    setLoading(true);
    setError(null);
    try {
      const results = await searchOpportunities({ ...criteria, query });
      setOpportunities(results);
    } catch (err: any) {
      console.error("Search failed:", err);
      setError('We encountered an issue scanning the web. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setQuery('');
    setCriteria({ types: [] });
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Radar className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Opportunity Radar</h1>
          </div>
          <div className="text-sm text-gray-500 font-medium hidden sm:block">
            Aggregating from multiple web sources
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-1/4 flex flex-col gap-4">
          <ProfilePanel profile={mockProfile} />
          <Filters criteria={criteria} onChange={setCriteria} />
        </aside>

        {/* Right Content */}
        <div className="w-full lg:w-3/4 flex flex-col gap-6">
          
          {/* Search Bar area */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out disabled:opacity-60"
                placeholder="Search internships, hackathons (Type 'error' to test failure)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
                aria-label="Search opportunities"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed min-w-[180px]"
              aria-label="Scan the web for opportunities"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Radar size={18} />}
              {loading ? 'Scanning...' : 'Scan the Web'}
            </button>
          </div>

          {/* Results Area */}
          <div className="flex flex-col gap-4" role="region" aria-live="polite">
            
            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-5 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Search Failed</h3>
                  <p className="text-sm">{error}</p>
                </div>
                <button 
                  onClick={handleSearch}
                  className="mt-3 sm:mt-0 flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <RefreshCw size={16} /> Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && opportunities.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center flex flex-col items-center">
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                  <Search size={32} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matching opportunities found</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">
                  This doesn't mean there are no opportunities out there! Try broadening your search criteria or checking different locations.
                </p>
                <button 
                  onClick={handleClearFilters}
                  className="text-blue-600 font-medium hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Loading State (Skeleton or overlay) */}
            {loading && opportunities.length === 0 && (
              <div className="py-20 flex flex-col justify-center items-center text-gray-500">
                <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
                <p className="font-medium animate-pulse">Scanning web sources...</p>
              </div>
            )}

            {/* Results Grid */}
            <div className={`flex flex-col gap-4 ${loading && opportunities.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              {!error && opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}

export default App;
