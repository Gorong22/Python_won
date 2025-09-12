// TodoList 프로그램의 메인 JavaScript 파일

// 전역 변수
let todoCount = 0;

// DOM이 로드된 후 실행
document.addEventListener('DOMContentLoaded', function() {
    updateTodoCount();
    
    // Enter 키로 할 일 추가
    document.getElementById('todo').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTodolist();
        }
    });
});

// 할 일 추가 함수
const addTodolist = () => {
    // 입력 필드와 리스트 요소 가져오기
    const todoInput = document.getElementById("todo");
    const todoList = document.getElementById("todoList");
    
    // DOM 요소 존재 여부 확인
    if (!todoInput || !todoList) {
        console.error("필요한 DOM 요소를 찾을 수 없습니다.");
        return;
    }
    
    // 입력값 가져오기 및 공백 제거
    const todo = todoInput.value.trim();
    
    // 입력값 유효성 검사
    if (!todo) {
        alert("할 일을 입력해주세요!");
        todoInput.focus();
        return;
    }
    
    // 할 일 항목 생성
    const todoItem = document.createElement("li");
    todoItem.className = "todo-item";
    
    // 할 일 텍스트 영역
    const todoText = document.createElement("span");
    todoText.className = "todo-item-text";
    todoText.textContent = todo;
    todoText.addEventListener('click', () => toggleComplete(todoItem));
    
    // 버튼 컨테이너
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "todo-item-actions";
    
    // 완료 버튼
    const completeBtn = document.createElement("button");
    completeBtn.className = "todo-btn complete-btn";
    completeBtn.textContent = "완료";
    completeBtn.addEventListener('click', () => toggleComplete(todoItem));
    
    // 개별 삭제 버튼
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "todo-btn delete-item-btn";
    deleteBtn.textContent = "삭제";
    deleteBtn.addEventListener('click', () => deleteTodoItem(todoItem));
    
    // 요소들을 조립
    buttonContainer.appendChild(completeBtn);
    buttonContainer.appendChild(deleteBtn);
    todoItem.appendChild(todoText);
    todoItem.appendChild(buttonContainer);
    
    // 리스트에 추가
    todoList.appendChild(todoItem);
    
    // 입력 필드 초기화
    todoInput.value = "";
    todoInput.focus();
    
    // 카운트 업데이트
    updateTodoCount();
    
    // 성공 메시지 (선택사항)
    showNotification("할 일이 추가되었습니다!", "success");
};

// 할 일 완료/미완료 토글
const toggleComplete = (todoItem) => {
    if (todoItem.classList.contains('completed')) {
        todoItem.classList.remove('completed');
        showNotification("할 일을 미완료로 변경했습니다.", "info");
    } else {
        todoItem.classList.add('completed');
        showNotification("할 일을 완료했습니다! 🎉", "success");
    }
};

// 개별 할 일 삭제
const deleteTodoItem = (todoItem) => {
    if (confirm("정말로 이 할 일을 삭제하시겠습니까?")) {
        todoItem.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
            todoItem.remove();
            updateTodoCount();
            showNotification("할 일이 삭제되었습니다.", "info");
        }, 300);
    }
};

// 마지막 할 일 삭제 함수
const deleteTodolist = () => {
    const todoList = document.getElementById("todoList");
    
    // DOM 요소 존재 여부 확인
    if (!todoList) {
        console.error("할 일 리스트를 찾을 수 없습니다.");
        return;
    }
    
    // 삭제할 항목이 있는지 확인
    if (todoList.children.length === 0) {
        alert("삭제할 할 일이 없습니다!");
        return;
    }
    
    // 마지막 항목 삭제
    const lastItem = todoList.lastChild;
    lastItem.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
        lastItem.remove();
        updateTodoCount();
        showNotification("마지막 할 일이 삭제되었습니다.", "info");
    }, 300);
};

// 전체 할 일 삭제
const clearAllTodos = () => {
    const todoList = document.getElementById("todoList");
    
    if (!todoList) {
        console.error("할 일 리스트를 찾을 수 없습니다.");
        return;
    }
    
    if (todoList.children.length === 0) {
        alert("삭제할 할 일이 없습니다!");
        return;
    }
    
    if (confirm("정말로 모든 할 일을 삭제하시겠습니까?")) {
        // 애니메이션과 함께 모든 항목 삭제
        const items = Array.from(todoList.children);
        items.forEach((item, index) => {
            setTimeout(() => {
                item.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => item.remove(), 300);
            }, index * 100);
        });
        
        setTimeout(() => {
            updateTodoCount();
            showNotification("모든 할 일이 삭제되었습니다.", "info");
        }, items.length * 100 + 300);
    }
};

// 할 일 개수 업데이트
const updateTodoCount = () => {
    const todoList = document.getElementById("todoList");
    const countElement = document.getElementById("todoCount");
    
    if (todoList && countElement) {
        todoCount = todoList.children.length;
        countElement.textContent = todoCount;
        
        // 개수에 따른 색상 변경
        if (todoCount === 0) {
            countElement.style.background = '#6c757d';
        } else if (todoCount <= 3) {
            countElement.style.background = '#28a745';
        } else if (todoCount <= 7) {
            countElement.style.background = '#ffc107';
        } else {
            countElement.style.background = '#dc3545';
        }
    }
};

// 알림 메시지 표시
const showNotification = (message, type = 'info') => {
    // 기존 알림 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 스타일 적용
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '600',
        zIndex: '1000',
        animation: 'slideInRight 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });
    
    // 타입별 색상
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    // 문서에 추가
    document.body.appendChild(notification);
    
    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// CSS 애니메이션 추가
const addAnimations = () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideOut {
            to {
                opacity: 0;
                transform: translateX(100px);
            }
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutRight {
            to {
                opacity: 0;
                transform: translateX(100px);
            }
        }
    `;
    document.head.appendChild(style);
};

// 페이지 로드 시 애니메이션 추가
addAnimations();