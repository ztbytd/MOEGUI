import React, { useState, useEffect } from 'react';
import Sidebar from '../sidepanel/components/Sidebar';
import MainContent from '../sidepanel/components/MainContent';
import SettingsPanel from '../sidepanel/components/SettingsPanel';
import '../sidepanel/App.css';

function PreviewApp() {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    apiBaseUrl: 'https://action.h7ml.cn',
    apiKey: '',
    apiModel: 'gemini-3-flash-preview'
  });
  const [conversations, setConversations] = useState({});
  const [currentConversationId, setCurrentConversationId] = useState(null);

  useEffect(() => {
    loadSettings();
    loadConversations();
    createInitialConversation();
  }, []);

  const createInitialConversation = () => {
    const id = Date.now().toString();
    const newConv = {
      id,
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString()
    };
    setConversations({ [id]: newConv });
    setCurrentConversationId(id);
  };

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['apiBaseUrl', 'apiKey', 'apiModel']);
      if (result.apiBaseUrl || result.apiKey || result.apiModel) {
        setSettings({
          apiBaseUrl: result.apiBaseUrl || 'https://action.h7ml.cn',
          apiKey: result.apiKey || '',
          apiModel: result.apiModel || 'gemini-3-flash-preview'
        });
      }
    } catch (error) {
      console.log('Preview mode: using default settings');
    }
  };

  const loadConversations = async () => {
    try {
      const data = await chrome.storage.local.get(['conversations']);
      if (data.conversations) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.log('Preview mode: no saved conversations');
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await chrome.storage.local.set(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.log('Preview mode: settings saved to state only');
      setSettings(newSettings);
    }
  };

  const saveConversations = async (newConversations) => {
    try {
      await chrome.storage.local.set({ conversations: newConversations });
      setConversations(newConversations);
    } catch (error) {
      console.log('Preview mode: conversations saved to state only');
      setConversations(newConversations);
    }
  };

  const createNewConversation = () => {
    const id = Date.now().toString();
    const newConv = {
      id,
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString()
    };
    const updated = { ...conversations, [id]: newConv };
    setConversations(updated);
    setCurrentConversationId(id);
    saveConversations(updated);
  };

  const loadConversation = (id) => {
    setCurrentConversationId(id);
  };

  const updateConversation = (id, updates) => {
    const updated = {
      ...conversations,
      [id]: { ...conversations[id], ...updates }
    };
    setConversations(updated);
    saveConversations(updated);
  };

  return (
    <div className="app-container">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={createNewConversation}
        onLoadConversation={loadConversation}
        onOpenSettings={() => setShowSettings(true)}
      />
      <MainContent
        settings={settings}
        currentConversationId={currentConversationId}
        conversations={conversations}
        onUpdateConversation={updateConversation}
      />
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default PreviewApp;
