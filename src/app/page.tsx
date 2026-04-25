"use client";

import { useState, useEffect } from 'react';

export default function App() {
  const [user, setUser] = useState<any>(undefined);
  const [isLoginState, setIsLoginState] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Dashboard Nav
  const [activeTab, setActiveTab] = useState<'profile'|'discover'|'network'>('profile');
  
  // Profile
  const [bio, setBio] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Discover
  const [connections, setConnections] = useState<any[]>([]); 
  const [loadingContext, setLoadingContext] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [discoverMode, setDiscoverMode] = useState<'similar'|'desire'>('similar');
  const [discoverError, setDiscoverError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Desire
  const [wantBio, setWantBio] = useState('');
  const [updatingDesire, setUpdatingDesire] = useState(false);

  // Network State Collections
  const [pendingRequests, setPendingRequests] = useState<any[]>([]); 
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]); 
  const [activeNetwork, setActiveNetwork] = useState<any[]>([]); // Mutuals
  const [activeFollowers, setActiveFollowers] = useState<any[]>([]);
  const [activeFollowing, setActiveFollowing] = useState<any[]>([]);
  
  const [sentRequestIds, setSentRequestIds] = useState<Set<number>>(new Set());
  const [networkSubTab, setNetworkSubTab] = useState<'mutual'|'received'|'sent'>('mutual');

  // Shared Note
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [sharedNote, setSharedNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false); // UX requested feature

  // UI
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          setBio(data.user.bio || '');
          setWantBio(data.user.want_bio || '');
          if (!data.user.bio) setIsEditingProfile(true);
        } else {
          setUser(null);
        }
      });
  }, []);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const fetchConnections = async (mode: string, page: number = 1) => {
    setLoadingContext(true);
    setDiscoverError('');
    setConnections([]);
    try {
      const res = await fetch(`/api/connections?limit=10&page=${page}&mode=${mode}`);
      const data = await res.json();
      if (res.ok && data.connections) {
        setConnections(data.connections);
        setCurrentPage(data.currentPage);
        setTotalPages(data.totalPages);
      } else {
        if (data.error && data.error.includes('Please update')) {
          setDiscoverError(''); 
        } else {
          setDiscoverError(data.error);
        }
      }
    } catch (e) {
      console.error(e);
      setDiscoverError("Failed to fetch connections.");
    }
    setLoadingContext(false);
  };

  const fetchNetworkData = async () => {
    try {
      const pRes = await fetch('/api/network/requests', { cache: 'no-store' });
      const pData = await pRes.json();
      if (pRes.ok) {
        setPendingRequests(pData.incoming || []);
        setOutgoingRequests(pData.outgoing || []);
      }

      const cRes = await fetch('/api/network/connections', { cache: 'no-store' });
      const cData = await cRes.json();
      if (cRes.ok) {
        setActiveNetwork(cData.connections || []);
        setActiveFollowers(cData.activeFollowers || []);
        setActiveFollowing(cData.activeFollowing || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'discover') {
      if (discoverMode === 'similar') fetchConnections('similar', 1);
      else if (user && user.hasWantEmbedding) fetchConnections('desire', 1);
      else setConnections([]);
    } else if (activeTab === 'network') {
      fetchNetworkData();
      const interval = setInterval(fetchNetworkData, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab, discoverMode, user]);

  const handleAuth = async (e: any) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginState ? '/api/auth/login' : '/api/auth/register';
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setBio(data.user.bio || '');
      setWantBio(data.user.want_bio || '');
      if (!data.user.bio) setIsEditingProfile(true);
      setActiveTab('profile'); 
    } else {
      setAuthError(data.error);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setConnections([]);
    setActiveTab('profile');
  };

  const handleProfileUpdate = async (e: any) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio })
      });
      const data = await res.json();
      setUpdatingProfile(false);
      if (res.ok) {
        setUser((prev: any) => ({ ...prev, bio }));
        setIsEditingProfile(false);
        setToastMessage('Profile Saved!');
      } else {
        setToastMessage('Error: ' + (data.error || 'Failed to save'));
      }
    } catch(err) {
      setUpdatingProfile(false);
      setToastMessage('Network Error');
    }
  };

  const handleDesireSearch = async (e: any) => {
    e.preventDefault();
    if (!wantBio.trim()) return;
    setUpdatingDesire(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wantBio })
      });
      const data = await res.json();
      setUpdatingDesire(false);
      if (res.ok) {
        setUser({ ...user, hasWantEmbedding: true, want_bio: wantBio });
        fetchConnections('desire', 1);
      } else {
        setToastMessage('Error: ' + (data.error || 'Failed to update desire'));
      }
    } catch(err) {
      setUpdatingDesire(false);
      setToastMessage('Network Error');
    }
  };

  const sendRequest = async (e: any, receiverId: number) => {
    e.stopPropagation();
    const newSet = new Set(sentRequestIds);
    newSet.add(receiverId);
    setSentRequestIds(newSet);

    try {
      const res = await fetch('/api/network/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId })
      });
      if (res.ok) {
        setToastMessage("Follow requested");
        fetchNetworkData(); // refresh seamlessly
      } else {
        const revertSet = new Set(sentRequestIds);
        revertSet.delete(receiverId);
        setSentRequestIds(revertSet);
        const d = await res.json();
        if (d.message === 'Connected instantly!') setToastMessage("Connection made!");
        else setToastMessage(d.error || "Failed to send");
        fetchNetworkData();
      }
    } catch (e) {
      setToastMessage("Error sending request");
    }
  };

  const handleRequestAction = async (requestId: number, action: 'accept'|'reject'|'disconnect', targetUserId?: number) => {
    // Determine the ID to dispatch. If disconnect, this is removing OUR outbound edge. If targetUserID is set, wait.
    // Our refactored API looks up by the request ID properly, but if passing connection_id from active arrays, they might just be edge IDs.
    const res = await fetch('/api/network/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action })
    });
    
    if (res.ok) {
      if (action === 'accept') setToastMessage('Accepted Request and Followed back!');
      else if (action === 'reject') setToastMessage('Ignored Request');
      else if (action === 'disconnect') setToastMessage('Unfollowed');
      
      if (targetUserId) {
        const revertSet = new Set(sentRequestIds);
        revertSet.delete(targetUserId);
        setSentRequestIds(revertSet);
      }

      fetchNetworkData();
      if (activeTab === 'discover') {
        if (discoverMode === 'similar') fetchConnections('similar', currentPage);
        else if (user && user.hasWantEmbedding) fetchConnections('desire', currentPage);
      }
    }
  };

  const openSharedNote = async (connectionId: number) => {
    setSelectedConnectionId(connectionId);
    setSharedNote('Loading note...');
    setIsEditingNote(false); // Reset to read mode
    const res = await fetch(`/api/notes?connectionId=${connectionId}`, { cache: 'no-store' });
    const data = await res.json();
    if (res.ok && data.note) {
      setSharedNote(data.note.content || '');
      fetchNetworkData();
    } else {
      setSharedNote('');
    }
  };

  const saveSharedNote = async () => {
    if (!selectedConnectionId) return;
    setNoteSaving(true);
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId: selectedConnectionId, content: sharedNote })
    });
    setNoteSaving(false);
    if (res.ok) {
      setToastMessage("Note Saved");
      setIsEditingNote(false);
      fetchNetworkData();
    } else {
      setToastMessage("Failed to save Note");
    }
  };

  if (user === undefined) {
    return <div className="auth-container"><p className="loading">Initializing Neural Space...</p></div>;
  }

  if (user === null) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 style={{fontSize: '2.5rem', marginBottom: '1rem'}}>Resolign</h1>
          <p>The premium network for deep thinkers. Match based on true semantics.</p>
          {authError && <div className="error-text">{authError}</div>}
          <form onSubmit={handleAuth}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
            <input 
              type="password" 
              className="input-field" 
              placeholder="Password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button className="btn" style={{ width: '100%', marginBottom: '1rem' }} type="submit">
              {isLoginState ? 'Login' : 'Signup'}
            </button>
          </form>
          <a href="#" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }} onClick={(e) => { e.preventDefault(); setIsLoginState(!isLoginState); }}>
            {isLoginState ? "Don't have an account? Signup here." : "Return to Login"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent)', color: 'white', padding: '12px 24px',
          borderRadius: '24px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          fontSize: '0.95rem', fontWeight: 500, animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

      <div className="sidebar">
        <h1>Resolign.</h1>
        <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          My Identity
        </div>
        <div className={`nav-item ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => setActiveTab('discover')}>
          Discover Area
        </div>
        <div className={`nav-item ${activeTab === 'network' ? 'active' : ''}`} onClick={() => { setActiveTab('network'); setSelectedConnectionId(null); }}>
          Core Network
          {pendingRequests.length > 0 && (
            <span style={{background: 'var(--accent)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: '8px'}}>
              {pendingRequests.length}
            </span>
          )}
        </div>
        
        <div className="sidebar-bottom">
          <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>@{user.username}</div>
          <button className="btn" onClick={logout} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', width: '100%', fontSize: '0.9rem', padding: '0.5rem' }}>
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'profile' && (
          <div>
            <h2>Manage Your Identity</h2>
            <p>Your core profile.</p>

            {user.bio && !isEditingProfile ? (
              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>Who I Am (Core Personality)</h3>
                <p style={{fontSize: '1rem', fontStyle: 'italic', background: 'var(--bg-lighter)', padding: '1rem', borderRadius: '8px', lineHeight: '1.6'}}>
                  "{user.bio}"
                </p>
                <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                  <button className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', width: 'auto' }} onClick={() => setIsEditingProfile(true)}>
                    Edit Identity
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate}>
                <div className="card" style={{ marginBottom: '1rem' }}>
                  <h3>Who I Am (Core Personality)</h3>
                  <textarea 
                    className="input-field" 
                    placeholder="Who are you? What drives you?"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    style={{ minHeight: '80px' }}
                    required
                  />
                </div>
                <div style={{ textAlign: 'right' }}>
                  {user.bio && (
                    <button type="button" className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', marginRight: '1rem', width: 'auto' }} onClick={() => { setIsEditingProfile(false); setBio(user.bio); }}>
                      Cancel
                    </button>
                  )}
                  <button className="btn" type="submit" disabled={updatingProfile} style={{ width: 'auto' }}>
                    {updatingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'discover' && (
          <div>
            <h2>Discover Cards</h2>
            <p>Filter connections through our semantic space.</p>
            
            <div className="tabs-container">
              <div className={`tab-button ${discoverMode === 'similar' ? 'active' : ''}`} onClick={() => setDiscoverMode('similar')}>
                Similar To Me
              </div>
              <div className={`tab-button ${discoverMode === 'desire' ? 'active' : ''}`} onClick={() => setDiscoverMode('desire')}>
                What I Desire
              </div>
            </div>
            
            {discoverMode === 'desire' && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h3>Search Request</h3>
                <form onSubmit={handleDesireSearch}>
                  <textarea className="input-field" placeholder="I am looking for someone who appreciates..." value={wantBio} onChange={e => setWantBio(e.target.value)} style={{ minHeight: '80px', marginBottom: '1rem' }} />
                  <div style={{ textAlign: 'right' }}>
                    <button className="btn" type="submit" disabled={updatingDesire || !wantBio.trim()}>{updatingDesire ? 'Analyzing...' : 'Execute Search'}</button>
                  </div>
                </form>
              </div>
            )}

            {loadingContext && <p className="loading">Scanning network vectors...</p>}
            {!loadingContext && discoverError && (
              <div className="error-text" style={{ padding: '1rem', borderRadius: '8px' }}>{discoverError}</div>
            )}
            {!loadingContext && !discoverError && connections.length === 0 && (
              <p>{discoverMode === 'desire' ? "No matches found." : "No connections found."}</p>
            )}

            <div className="user-cards">
              {connections.map(conn => {
                let displayStatus = 'Follow';
                let disabled = false;
                const localRequested = sentRequestIds.has(conn.id);

                if (conn.connection_status === 'accepted') {
                  displayStatus = 'Following';
                  disabled = true;
                } else if (conn.connection_status === 'pending' || localRequested) {
                  displayStatus = 'Requested';
                  disabled = true;
                }

                return (
                  <div key={conn.id} className="card user-card" onClick={() => setExpandedCardId(expandedCardId === conn.id ? null : conn.id)} style={{ cursor: 'pointer', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                      <h3 style={{ margin: 0 }}>@{conn.username}</h3>
                      <button 
                        className="btn" 
                        onClick={(e) => sendRequest(e, conn.id)}
                        disabled={disabled}
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', background: disabled ? 'var(--bg-lighter)' : 'var(--accent)', color: disabled ? 'var(--text-muted)' : 'white', border: disabled ? '1px solid var(--border)' : 'none' }}>
                        {displayStatus}
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                      {expandedCardId === conn.id ? conn.bio : (conn.bio.length > 80 ? conn.bio.substring(0, 80) + '...' : conn.bio)}
                    </p>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && !loadingContext && !discoverError && connections.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  className="btn" 
                  style={{ width: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  onClick={() => fetchConnections(discoverMode, currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <div style={{ padding: '0.6rem', color: 'var(--text-muted)' }}>
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  className="btn" 
                  style={{ width: 'auto', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  onClick={() => fetchConnections(discoverMode, currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'network' && !selectedConnectionId && (
          <div>
            <h2>Core Network</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Manage your abstract social connections.</p>
            
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1rem', overflowX: 'auto' }}>
              <div onClick={() => setNetworkSubTab('mutual')} style={{ padding: '0.8rem 1.5rem', cursor: 'pointer', fontWeight: 500, borderBottom: networkSubTab === 'mutual' ? '2px solid var(--accent)' : '2px solid transparent', color: networkSubTab === 'mutual' ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Connections {activeNetwork.length > 0 && `(${activeNetwork.length})`}
              </div>
              <div onClick={() => setNetworkSubTab('received')} style={{ padding: '0.8rem 1.5rem', cursor: 'pointer', fontWeight: 500, borderBottom: networkSubTab === 'received' ? '2px solid var(--accent)' : '2px solid transparent', color: networkSubTab === 'received' ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Followers {(pendingRequests.length + activeFollowers.length) > 0 && `(${pendingRequests.length + activeFollowers.length})`}
              </div>
              <div onClick={() => setNetworkSubTab('sent')} style={{ padding: '0.8rem 1.5rem', cursor: 'pointer', fontWeight: 500, borderBottom: networkSubTab === 'sent' ? '2px solid var(--accent)' : '2px solid transparent', color: networkSubTab === 'sent' ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Following {(outgoingRequests.length + activeFollowing.length) > 0 && `(${outgoingRequests.length + activeFollowing.length})`}
              </div>
            </div>

            <div style={{ background: 'var(--bg-lighter)', borderRadius: '12px', overflow: 'hidden' }}>
              
              {/* === CONNECTIONS (MUTUALS) === */}
              {networkSubTab === 'mutual' && (
                <div>
                  {activeNetwork.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>You have no connections.</div>
                  ) : (
                    activeNetwork.map(conn => {
                      const hasUpdate = conn.last_writer_id && conn.last_writer_id !== user.id;
                      return (
                        <div key={conn.connection_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid var(--bg)' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.3rem 0' }}>@{conn.username}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{conn.bio.length > 60 ? conn.bio.substring(0, 60) + '...' : conn.bio || 'No bio'}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.85rem' }} onClick={() => handleRequestAction(conn.connection_id, 'disconnect', conn.user_id)}>
                              Unfollow
                            </button>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', position: 'relative', fontSize: '0.85rem' }} onClick={() => openSharedNote(conn.connection_id)}>
                              Shared Note
                              {hasUpdate && <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', border: '2px solid var(--bg)' }} title="New Activity!" />}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* === FOLLOWERS === */}
              {networkSubTab === 'received' && (
                <div>
                  {pendingRequests.length === 0 && activeFollowers.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>You have no followers.</div>
                  ) : (
                    <>
                      {/* Incoming Pending */}
                      {pendingRequests.map(req => (
                        <div key={`pend-${req.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid var(--bg)' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.3rem 0' }}>@{req.username} <span style={{fontSize: '0.7rem', color: 'var(--accent)', marginLeft: '8px'}}>Wants to follow</span></h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.bio.length > 60 ? req.bio.substring(0, 60) + '...' : req.bio || 'No bio'}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.85rem' }} onClick={() => handleRequestAction(req.id, 'reject', req.sender_id)}>
                              Ignore
                            </button>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleRequestAction(req.id, 'accept', req.sender_id)}>
                              Accept
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Active Followers (Not mutual, just followers) */}
                      {activeFollowers.map(follower => (
                        <div key={`foll-${follower.user_id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid var(--bg)' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.3rem 0' }}>@{follower.username}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{follower.bio.length > 60 ? follower.bio.substring(0, 60) + '...' : follower.bio || 'No bio'}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={(e) => sendRequest(e, follower.user_id)}>
                              Follow Back
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* === FOLLOWING === */}
              {networkSubTab === 'sent' && (
                <div>
                  {outgoingRequests.length === 0 && activeFollowing.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>You aren't following anyone.</div>
                  ) : (
                    <>
                      {/* Active Followings */}
                      {activeFollowing.map(f => (
                        <div key={`af-${f.connection_id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid var(--bg)' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.3rem 0' }}>@{f.username}</h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{f.bio.length > 60 ? f.bio.substring(0, 60) + '...' : f.bio || 'No bio'}</p>
                          </div>
                          <div>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.85rem' }} onClick={() => handleRequestAction(f.connection_id, 'disconnect', f.user_id)}>
                              Unfollow
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Pending outbounds */}
                      {outgoingRequests.map(req => (
                        <div key={`out-${req.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderBottom: '1px solid var(--bg)' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.3rem 0' }}>@{req.username} <span style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '8px'}}>(Pending)</span></h4>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{req.bio.length > 60 ? req.bio.substring(0, 60) + '...' : req.bio || 'No bio'}</p>
                          </div>
                          <div>
                            <button className="btn" style={{ width: 'auto', padding: '0.4rem 0.8rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: '0.85rem' }} onClick={() => handleRequestAction(req.id, 'disconnect', req.receiver_id)}>
                              Withdraw
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'network' && selectedConnectionId && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <button className="btn" style={{ background: 'transparent', padding: '0 1rem 0 0', color: 'var(--accent)' }} onClick={() => setSelectedConnectionId(null)}>
                &larr; Back
              </button>
              <h2 style={{ margin: 0 }}>Shared Note</h2>
            </div>
            
            <p>A persistent shared space for your connection.</p>
            
            {!isEditingNote ? (
              <div className="card" style={{ padding: '2.5rem' }}>
                <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginTop: 0, color: 'var(--text)' }}>Message</h3>
                <div style={{ minHeight: '150px', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '1.05rem', color: sharedNote ? 'var(--text)' : 'var(--text-muted)', fontStyle: sharedNote ? 'normal' : 'italic' }}>
                  {sharedNote || 'Nothing written here yet. Start the conversation.'}
                </div>
                <div style={{ textAlign: 'right', marginTop: '2rem' }}>
                  <button className="btn" style={{width: 'auto'}} onClick={() => setIsEditingNote(true)}>Edit Note</button>
                </div>
              </div>
            ) : (
              <div className="card">
                <textarea 
                  className="input-field" 
                  value={sharedNote}
                  onChange={(e) => setSharedNote(e.target.value)}
                  style={{ minHeight: '300px', fontSize: '1rem', lineHeight: '1.6' }}
                  placeholder="Write your note here..."
                  autoFocus
                />
                <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button className="btn" style={{ background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', width: 'auto'}} onClick={() => setIsEditingNote(false)}>
                    Cancel
                  </button>
                  <button className="btn" style={{width: 'auto'}} onClick={saveSharedNote} disabled={noteSaving}>
                    {noteSaving ? 'Saving...' : 'Save Note'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
