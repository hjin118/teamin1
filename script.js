const STORAGE_KEY = 'studyroom_members';

let members = [];
let selectedMemberId = null;

const courseLabels = {
    'basic': '기초 공부',
    'intermediate': '중급 공부',
    'advanced': '고급 공부'
};

const attendanceLabels = {
    'present': '출석',
    'absent': '결석',
    'late': '지각'
};

function loadMembers() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        members = JSON.parse(stored);
        members.forEach(member => {
            if (!member.attendance) {
                member.attendance = {};
            }
            if (!member.progress) {
                member.progress = [];
            }
            if (!member.consultations) {
                member.consultations = [];
            }
            if (member.paymentStatus === undefined) {
                member.paymentStatus = 'unpaid';
            }
        });
    }
}

function saveMembers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function renderDashboard() {
    document.getElementById('totalMembers').textContent = members.length;

    const totalAttendanceRate = members.reduce((sum, member) => {
        return sum + calculateAttendanceRate(member);
    }, 0) / (members.length || 1);

    document.getElementById('avgAttendance').textContent = Math.round(totalAttendanceRate) + '%';

    const unpaidCount = members.filter(m => m.paymentStatus === 'unpaid').length;
    document.getElementById('unpaidMembers').textContent = unpaidCount;

    const totalConsultations = members.reduce((sum, member) => {
        return sum + (member.consultations || []).length;
    }, 0);
    document.getElementById('totalConsultations').textContent = totalConsultations;

    renderCourseChart();
    renderAttendanceChart();
    renderRecentConsultations();
}

function renderCourseChart() {
    const canvas = document.getElementById('courseChart');
    const ctx = canvas.getContext('2d');

    const courseStats = {
        'basic': members.filter(m => m.course === 'basic').length,
        'intermediate': members.filter(m => m.course === 'intermediate').length,
        'advanced': members.filter(m => m.course === 'advanced').length
    };

    const total = Object.values(courseStats).reduce((a, b) => a + b, 0);
    
    canvas.width = 300;
    canvas.height = 200;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('데이터가 없습니다', canvas.width / 2, canvas.height / 2);
        return;
    }

    const colors = ['#667eea', '#764ba2', '#f39c12'];
    const labels = ['기초 공부', '중급 공부', '고급 공부'];
    const data = [courseStats.basic, courseStats.intermediate, courseStats.advanced];

    const barWidth = 60;
    const gap = 30;
    const startX = (canvas.width - (data.length * barWidth + (data.length - 1) * gap)) / 2;
    const maxHeight = 150;
    const maxValue = Math.max(...data, 1);

    data.forEach((value, index) => {
        const x = startX + index * (barWidth + gap);
        const barHeight = (value / maxValue) * maxHeight;
        const y = canvas.height - barHeight - 30;

        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x + barWidth / 2, y - 10);

        ctx.fillStyle = '#666';
        ctx.font = '12px Segoe UI';
        ctx.fillText(labels[index], x + barWidth / 2, canvas.height - 10);
    });
}

function renderAttendanceChart() {
    const canvas = document.getElementById('attendanceChart');
    const ctx = canvas.getContext('2d');

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    members.forEach(member => {
        const attendance = member.attendance || {};
        Object.values(attendance).forEach(status => {
            if (status === 'present') totalPresent++;
            else if (status === 'absent') totalAbsent++;
            else if (status === 'late') totalLate++;
        });
    });

    const total = totalPresent + totalAbsent + totalLate;
    
    canvas.width = 300;
    canvas.height = 200;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (total === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('데이터가 없습니다', canvas.width / 2, canvas.height / 2);
        return;
    }

    const colors = ['#27ae60', '#e74c3c', '#f39c12'];
    const labels = ['출석', '결석', '지각'];
    const data = [totalPresent, totalAbsent, totalLate];

    const barWidth = 60;
    const gap = 30;
    const startX = (canvas.width - (data.length * barWidth + (data.length - 1) * gap)) / 2;
    const maxHeight = 150;
    const maxValue = Math.max(...data, 1);

    data.forEach((value, index) => {
        const x = startX + index * (barWidth + gap);
        const barHeight = (value / maxValue) * maxHeight;
        const y = canvas.height - barHeight - 30;

        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth, barHeight);

        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(value.toString(), x + barWidth / 2, y - 10);

        ctx.fillStyle = '#666';
        ctx.font = '12px Segoe UI';
        ctx.fillText(labels[index], x + barWidth / 2, canvas.height - 10);
    });
}

function renderRecentConsultations() {
    const list = document.getElementById('recentConsultations');
    const allConsultations = [];

    members.forEach(member => {
        if (member.consultations) {
            member.consultations.forEach(consultation => {
                allConsultations.push({
                    ...consultation,
                    memberName: member.name,
                    memberId: member.id
                });
            });
        }
    });

    allConsultations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const recent = allConsultations.slice(0, 10);

    if (recent.length === 0) {
        list.innerHTML = '<li class="no-records">최근 상담 기록이 없습니다</li>';
        return;
    }

    list.innerHTML = recent.map(c => `
        <li class="recent-consultation-item" data-member-id="${c.memberId}">
            <div class="consultation-header">
                <span class="consultation-date">${c.date}</span>
                <span class="consultation-member">${c.memberName}</span>
            </div>
            <div class="consultation-preview">${c.content.substring(0, 50)}${c.content.length > 50 ? '...' : ''}</div>
        </li>
    `).join('');

    list.querySelectorAll('.recent-consultation-item').forEach(item => {
        item.addEventListener('click', () => {
            const memberId = item.dataset.memberId;
            showMemberDetail(memberId);
        });
    });
}

function renderMembers(filteredMembers = null) {
    const list = document.getElementById('memberList');
    const displayMembers = filteredMembers || members;

    if (displayMembers.length === 0) {
        list.innerHTML = '<li class="empty-state"><div class="icon">📋</div><p>등록된 회원이 없습니다</p></li>';
        return;
    }

    list.innerHTML = displayMembers.map(member => `
        <li data-id="${member.id}" class="${member.paymentStatus === 'unpaid' ? 'unpaid' : ''}">
            <div class="member-name">
                ${member.name}
                ${member.paymentStatus === 'unpaid' ? '<span class="unpaid-badge">미납</span>' : ''}
            </div>
            <div class="member-info">
                ${member.age}세 | ${courseLabels[member.course] || member.course}
            </div>
        </li>
    `).join('');
}

function calculateAttendanceRate(member) {
    const attendance = member.attendance || {};
    const records = Object.keys(attendance);
    if (records.length === 0) return 0;

    let totalPoints = 0;
    let maxPoints = records.length * 2;

    records.forEach(date => {
        const status = attendance[date];
        if (status === 'present') {
            totalPoints += 2;
        } else if (status === 'late') {
            totalPoints += 1;
        }
    });

    return Math.round((totalPoints / maxPoints) * 100);
}

function getAttendanceStats(member) {
    const attendance = member.attendance || {};
    const records = Object.keys(attendance);
    
    return {
        present: records.filter(d => attendance[d] === 'present').length,
        absent: records.filter(d => attendance[d] === 'absent').length,
        late: records.filter(d => attendance[d] === 'late').length,
        total: records.length
    };
}

function renderAttendance(member) {
    const content = document.getElementById('attendanceContent');
    const today = formatDate(new Date());
    const currentStatus = member.attendance[today];
    const rate = calculateAttendanceRate(member);
    const stats = getAttendanceStats(member);

    content.innerHTML = `
        <div class="date-selector">
            <label for="attendanceDate">날짜 선택</label>
            <input type="date" id="attendanceDate" value="${today}">
        </div>
        
        <div class="attendance-buttons">
            <button class="btn-attendance btn-present" data-status="present" ${currentStatus === 'present' ? 'disabled' : ''}>
                <span class="icon">✅</span>
                <span>출석</span>
            </button>
            <button class="btn-attendance btn-late" data-status="late" ${currentStatus === 'late' ? 'disabled' : ''}>
                <span class="icon">⏰</span>
                <span>지각</span>
            </button>
            <button class="btn-attendance btn-absent" data-status="absent" ${currentStatus === 'absent' ? 'disabled' : ''}>
                <span class="icon">❌</span>
                <span>결석</span>
            </button>
        </div>

        <div class="current-status ${currentStatus ? 'has-status' : ''}">
            <strong>오늘 출결:</strong> 
            ${currentStatus ? `<span class="status-badge ${currentStatus}">${attendanceLabels[currentStatus]}</span>` : '<span class="no-status">미체크</span>'}
        </div>

        <div class="attendance-stats">
            <div class="stat-item">
                <div class="stat-label">출석률</div>
                <div class="stat-value ${rate >= 80 ? 'good' : rate >= 60 ? 'medium' : 'bad'}">${rate}%</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">출석</div>
                <div class="stat-value present">${stats.present}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">결석</div>
                <div class="stat-value absent">${stats.absent}</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">지각</div>
                <div class="stat-value late">${stats.late}</div>
            </div>
        </div>

        <div class="attendance-history">
            <h3>최근 출결 기록</h3>
            <ul class="history-list">
                ${renderAttendanceHistory(member.attendance)}
            </ul>
        </div>
    `;

    document.getElementById('attendanceDate').addEventListener('change', (e) => {
        renderAttendanceForDate(member, e.target.value);
    });
}

function renderAttendanceForDate(member, date) {
    const currentStatus = member.attendance[date];
    const content = document.getElementById('attendanceContent');

    const buttonsSection = content.querySelector('.attendance-buttons');
    buttonsSection.querySelectorAll('.btn-attendance').forEach(btn => {
        const status = btn.dataset.status;
        btn.disabled = (status === currentStatus);
    });

    const statusSection = content.querySelector('.current-status');
    statusSection.innerHTML = `
        <strong>${date} 출결:</strong> 
        ${currentStatus ? `<span class="status-badge ${currentStatus}">${attendanceLabels[currentStatus]}</span>` : '<span class="no-status">미체크</span>'}
    `;
}

function renderAttendanceHistory(attendance) {
    const records = Object.keys(attendance).sort((a, b) => new Date(b) - new Date(a)).slice(0, 10);
    
    if (records.length === 0) {
        return '<li class="no-records">출결 기록이 없습니다</li>';
    }

    return records.map(date => `
        <li class="history-item">
            <span class="history-date">${date}</span>
            <span class="history-status ${attendance[date]}">${attendanceLabels[attendance[date]]}</span>
        </li>
    `).join('');
}

function handleAttendanceClick(status) {
    if (!selectedMemberId) return;

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const dateInput = document.getElementById('attendanceDate');
    const date = dateInput.value;

    if (member.attendance[date] === status) {
        delete member.attendance[date];
    } else {
        member.attendance[date] = status;
    }

    saveMembers();
    renderMembers();
    renderAttendance(member);
    renderDashboard();
}

function renderProgress(member) {
    const content = document.getElementById('progressContent');
    const progress = member.progress || [];

    content.innerHTML = `
        <div class="progress-form">
            <div class="form-group">
                <label for="progressDate">날짜</label>
                <input type="date" id="progressDate" value="${formatDate(new Date())}">
            </div>
            <div class="form-group">
                <label for="progressLesson">수업 내용</label>
                <input type="text" id="progressLesson" placeholder="예: 로봇 움직이기 프로그램 작성">
            </div>
            <div class="form-group">
                <label for="progressNote">비고</label>
                <textarea id="progressNote" placeholder="추가 사항"></textarea>
            </div>
            <button class="btn btn-primary btn-add-progress" type="button">진도 추가</button>
        </div>
        
        <div class="progress-history">
            <h3>진도 기록 (${progress.length})</h3>
            <ul class="history-list">
                ${renderProgressHistory(progress)}
            </ul>
        </div>
    `;

    content.querySelector('.btn-add-progress').addEventListener('click', () => {
        handleAddProgress();
    });
}

function renderProgressHistory(progress) {
    const sorted = [...progress].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sorted.length === 0) {
        return '<li class="no-records">진도 기록이 없습니다</li>';
    }

    return sorted.map((p, index) => `
        <li class="history-item progress-item">
            <div class="progress-header">
                <span class="history-date">${p.date}</span>
                <button class="btn-delete-progress" data-index="${progress.indexOf(p)}">삭제</button>
            </div>
            <div class="progress-content">
                <strong>${p.lesson}</strong>
                ${p.note ? `<p class="progress-note">${p.note}</p>` : ''}
            </div>
        </li>
    `).join('');
}

function handleAddProgress() {
    if (!selectedMemberId) return;

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const date = document.getElementById('progressDate').value;
    const lesson = document.getElementById('progressLesson').value.trim();
    const note = document.getElementById('progressNote').value.trim();

    if (!date || !lesson) {
        alert('날짜와 수업 내용을 입력하세요.');
        return;
    }

    if (!member.progress) {
        member.progress = [];
    }

    member.progress.push({
        id: generateId(),
        date,
        lesson,
        note,
        createdAt: new Date().toISOString()
    });

    saveMembers();
    renderProgress(member);
}

function handleDeleteProgress(index) {
    if (!selectedMemberId) return;

    const member = members.find(m => m.id === selectedMemberId);
    if (!member || !member.progress) return;

    member.progress.splice(index, 1);
    saveMembers();
    renderProgress(member);
}

function renderConsultation(member) {
    const content = document.getElementById('consultationContent');
    const consultations = member.consultations || [];

    content.innerHTML = `
        <div class="consultation-form">
            <div class="form-group">
                <label for="consultationDate">날짜</label>
                <input type="date" id="consultationDate" value="${formatDate(new Date())}">
            </div>
            <div class="form-group">
                <label for="consultationTextContent">상담 내용</label>
                <textarea id="consultationTextContent" rows="4" placeholder="상담 내용을 입력하세요"></textarea>
            </div>
            <div class="form-group">
                <label for="consultationAction">후속 조치</label>
                <input type="text" id="consultationAction" placeholder="예: 학부모 연락, 추가 과제 제공">
            </div>
            <button class="btn btn-primary btn-add-consultation" type="button">상담 추가</button>
        </div>
        
        <div class="consultation-history">
            <h3>상담 기록 (${consultations.length})</h3>
            <ul class="history-list">
                ${renderConsultationHistory(consultations)}
            </ul>
        </div>
    `;

    const addBtn = content.querySelector('.btn-add-consultation');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAddConsultation();
        });
    }
}

function renderConsultationHistory(consultations) {
    const sorted = [...consultations].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sorted.length === 0) {
        return '<li class="no-records">상담 기록이 없습니다</li>';
    }

    return sorted.map((c, index) => `
        <li class="history-item consultation-item">
            <div class="consultation-header">
                <span class="history-date">${c.date}</span>
                <button class="btn-delete-consultation" data-index="${consultations.indexOf(c)}">삭제</button>
            </div>
            <div class="consultation-content">
                <p class="consultation-text">${c.content}</p>
                ${c.action ? `<p class="consultation-action"><strong>후속 조치:</strong> ${c.action}</p>` : ''}
            </div>
        </li>
    `).join('');
}

function handleAddConsultation() {
    console.log('상담 추가 시작, selectedMemberId:', selectedMemberId);
    
    if (!selectedMemberId) {
        console.log('선택된 회원이 없습니다.');
        return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) {
        console.log('회원을 찾을 수 없습니다.');
        return;
    }

    const dateInput = document.getElementById('consultationDate');
    const contentInput = document.getElementById('consultationTextContent');
    const actionInput = document.getElementById('consultationAction');

    if (!dateInput || !contentInput || !actionInput) {
        console.log('입력 요소를 찾을 수 없습니다.');
        console.log('dateInput:', dateInput);
        console.log('contentInput:', contentInput);
        console.log('actionInput:', actionInput);
        return;
    }

    const date = dateInput.value;
    const content = contentInput.value.trim();
    const action = actionInput.value.trim();

    console.log('상담 데이터:', { date, content, action });

    if (!date || !content) {
        alert('날짜와 상담 내용을 입력하세요.');
        return;
    }

    if (!member.consultations) {
        member.consultations = [];
    }

    const newConsultation = {
        id: generateId(),
        date,
        content,
        action,
        createdAt: new Date().toISOString()
    };

    member.consultations.push(newConsultation);
    console.log('상담 추가 완료:', newConsultation);

    saveMembers();
    renderConsultation(member);
    renderDashboard();
}

function handleDeleteConsultation(index) {
    if (!selectedMemberId) return;

    const member = members.find(m => m.id === selectedMemberId);
    if (!member || !member.consultations) return;

    member.consultations.splice(index, 1);
    saveMembers();
    renderConsultation(member);
    renderDashboard();
}

function togglePaymentStatus(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    member.paymentStatus = member.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    saveMembers();
    renderMembers();
    renderDashboard();
    showMemberDetail(memberId);
}

function showMemberDetail(memberId) {
    selectedMemberId = memberId;
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const detail = document.getElementById('memberDetail');
    detail.innerHTML = `
        <div class="detail-row">
            <span class="label">이름</span>
            <span class="value">${member.name}</span>
        </div>
        <div class="detail-row">
            <span class="label">나이</span>
            <span class="value">${member.age}세</span>
        </div>
        <div class="detail-row">
            <span class="label">연락처</span>
            <span class="value">${member.phone}</span>
        </div>
        <div class="detail-row">
            <span class="label">과정</span>
            <span class="value">${courseLabels[member.course] || member.course}</span>
        </div>
        <div class="detail-row">
            <span class="label">보호자</span>
            <span class="value">${member.parent}</span>
        </div>
        <div class="detail-row">
            <span class="label">주소</span>
            <span class="value">${member.address}</span>
        </div>
        <div class="detail-row">
            <span class="label">등록일</span>
            <span class="value">${formatDate(member.registrationDate)}</span>
        </div>
        <div class="detail-row payment-status-row">
            <span class="label">결제 상태</span>
            <span class="value">
                <span class="payment-badge ${member.paymentStatus}">${member.paymentStatus === 'paid' ? '완료' : '미납'}</span>
                <button class="btn btn-toggle-payment" data-id="${member.id}">상태 변경</button>
            </span>
        </div>
        <div class="detail-actions">
            <button class="btn btn-primary btn-edit" data-id="${member.id}">수정</button>
            <button class="btn btn-delete" data-id="${member.id}">삭제</button>
        </div>
    `;

    document.querySelectorAll('.member-list li').forEach(li => {
        li.classList.remove('active');
        if (li.dataset.id === memberId) {
            li.classList.add('active');
        }
    });

    renderAttendance(member);
    renderProgress(member);
    renderConsultation(member);
}

function resetForm() {
    document.getElementById('memberForm').reset();
    document.getElementById('memberId').value = '';
    document.getElementById('formTitle').textContent = '회원 등록';
    document.querySelector('.btn-primary[type="submit"]').textContent = '회원 등록';
}

function fillForm(member) {
    document.getElementById('memberId').value = member.id;
    document.getElementById('name').value = member.name;
    document.getElementById('age').value = member.age;
    document.getElementById('phone').value = member.phone;
    document.getElementById('course').value = member.course;
    document.getElementById('parent').value = member.parent;
    document.getElementById('address').value = member.address;

    document.getElementById('formTitle').textContent = '회원 수정';
    document.querySelector('.btn-primary[type="submit"]').textContent = '수정 완료';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleFormSubmit(e) {
    e.preventDefault();

    const memberId = document.getElementById('memberId').value;
    const memberData = {
        name: document.getElementById('name').value,
        age: parseInt(document.getElementById('age').value),
        phone: document.getElementById('phone').value,
        course: document.getElementById('course').value,
        parent: document.getElementById('parent').value,
        address: document.getElementById('address').value
    };

    if (memberId) {
        const index = members.findIndex(m => m.id === memberId);
        if (index !== -1) {
            members[index] = { ...members[index], ...memberData };
        }
    } else {
        members.push({
            id: generateId(),
            ...memberData,
            registrationDate: new Date().toISOString(),
            attendance: {},
            progress: [],
            consultations: [],
            paymentStatus: 'unpaid'
        });
    }

    saveMembers();
    renderMembers();
    renderDashboard();
    resetForm();
}

function handleDelete(memberId) {
    if (!confirm('정말로 이 회원을 삭제하시겠습니까?')) {
        return;
    }

    members = members.filter(m => m.id !== memberId);
    saveMembers();
    renderMembers();
    renderDashboard();

    clearAllDetailViews();
}

function clearAllDetailViews() {
    document.getElementById('memberDetail').innerHTML = '<p class="placeholder">회원을 선택하세요</p>';
    document.getElementById('attendanceContent').innerHTML = '<p class="placeholder">회원을 선택하세요</p>';
    document.getElementById('progressContent').innerHTML = '<p class="placeholder">회원을 선택하세요</p>';
    document.getElementById('consultationContent').innerHTML = '<p class="placeholder">회원을 선택하세요</p>';
    selectedMemberId = null;
}

function handleEdit(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    fillForm(member);
}

const debouncedSearch = debounce(function(query) {
    const unpaidOnly = document.getElementById('unpaidFilter').checked;
    
    let filtered = members.filter(member =>
        member.name.includes(query) || member.phone.includes(query)
    );

    if (unpaidOnly) {
        filtered = filtered.filter(member => member.paymentStatus === 'unpaid');
    }

    renderMembers(filtered);
}, 300);

function handleSearch(query) {
    debouncedSearch(query);
}

function init() {
    loadMembers();
    renderMembers();
    renderDashboard();

    document.getElementById('memberForm').addEventListener('submit', handleFormSubmit);

    document.getElementById('searchInput').addEventListener('input', (e) => {
        handleSearch(e.target.value.trim());
    });

    document.getElementById('unpaidFilter').addEventListener('change', (e) => {
        handleSearch(document.getElementById('searchInput').value.trim());
    });

    document.getElementById('memberList').addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li || !li.dataset.id) return;

        if (e.target.classList.contains('btn-edit')) {
            const memberId = e.target.dataset.id;
            handleEdit(memberId);
        } else if (e.target.classList.contains('btn-delete')) {
            const memberId = e.target.dataset.id;
            handleDelete(memberId);
        } else {
            showMemberDetail(li.dataset.id);
        }
    });

    document.getElementById('attendanceContent').addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-attendance');
        if (!btn) return;

        const status = btn.dataset.status;
        handleAttendanceClick(status);
    });

    document.getElementById('memberDetail').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-toggle-payment')) {
            const memberId = e.target.dataset.id;
            togglePaymentStatus(memberId);
        }
    });

    document.getElementById('progressContent').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-progress')) {
            const index = parseInt(e.target.dataset.index);
            handleDeleteProgress(index);
        }
    });

    document.getElementById('consultationContent').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete-consultation')) {
            const index = parseInt(e.target.dataset.index);
            handleDeleteConsultation(index);
        } else if (e.target.classList.contains('btn-add-consultation')) {
            e.preventDefault();
            e.stopPropagation();
            handleAddConsultation();
        }
    });
}

init();